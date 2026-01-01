import { Server } from "socket.io"
import { Analytics } from "../models/analytics.model.js"

let connections = {}
let messages = {}
let timeOnline = {}
let socketUserMap = {} // socket.id -> { username, meetingCode }
let meetingHosts = {} // meetingCode -> socket.id
let lockedMeetings = {} // meetingCode -> boolean
let waitingQueue = {} // meetingCode -> [socket.id]

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path, username) => {
            // Check if meeting is locked
            if (lockedMeetings[path] && (!meetingHosts[path] || meetingHosts[path] !== socket.id)) {
                return socket.emit("meeting-locked-status", true);
            }

            // Waiting Room Logic
            if (meetingHosts[path] && meetingHosts[path] !== socket.id) {
                if (waitingQueue[path] === undefined) waitingQueue[path] = [];
                if (!waitingQueue[path].includes(socket.id)) {
                    waitingQueue[path].push(socket.id);
                    socketUserMap[socket.id] = { username, meetingCode: path };
                    // Notify host
                    io.to(meetingHosts[path]).emit("waiting-user", { socketId: socket.id, username });
                    return socket.emit("waiting-room-status", true);
                }
            }

            if (connections[path] === undefined) {
                connections[path] = []
                meetingHosts[path] = socket.id; // First person is host
            }
            
            connections[path].push(socket.id)
            timeOnline[socket.id] = new Date();
            socketUserMap[socket.id] = { username, meetingCode: path };

            // Tell the user if they are host
            socket.emit("is-host", meetingHosts[path] === socket.id);

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }
        })

        socket.on("admit-user", (targetSocketId) => {
            const userData = socketUserMap[socket.id];
            if (userData && meetingHosts[userData.meetingCode] === socket.id) {
                const path = userData.meetingCode;
                if (waitingQueue[path]) {
                    waitingQueue[path] = waitingQueue[path].filter(id => id !== targetSocketId);
                    // Standard join logic for admitted user
                    if (connections[path] === undefined) connections[path] = [];
                    connections[path].push(targetSocketId);
                    
                    const admittedUserData = socketUserMap[targetSocketId];
                    io.to(targetSocketId).emit("waiting-room-status", false);
                    io.to(targetSocketId).emit("is-host", false);

                    for (let a = 0; a < connections[path].length; a++) {
                        io.to(connections[path][a]).emit("user-joined", targetSocketId, connections[path])
                    }
                }
            }
        })

        socket.on("mute-all", () => {
            const userData = socketUserMap[socket.id];
            if (userData && meetingHosts[userData.meetingCode] === socket.id) {
                connections[userData.meetingCode].forEach(elem => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("force-mute");
                    }
                });
            }
        })

        socket.on("kick-user", (targetSocketId) => {
            const userData = socketUserMap[socket.id];
            if (userData && meetingHosts[userData.meetingCode] === socket.id) {
                io.to(targetSocketId).emit("kicked");
            }
        })

        socket.on("lock-meeting", (isLocked) => {
            const userData = socketUserMap[socket.id];
            if (userData && meetingHosts[userData.meetingCode] === socket.id) {
                lockedMeetings[userData.meetingCode] = isLocked;
                connections[userData.meetingCode].forEach(elem => {
                    io.to(elem).emit("meeting-locked", isLocked);
                });
            }
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                const matchingRoom = userData.meetingCode;
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }
                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }
        })

        socket.on("whiteboard-data", (data) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                const matchingRoom = userData.meetingCode;
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("whiteboard-data", data);
                    }
                })
            }
        })

        socket.on("reaction", (emoji) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                connections[userData.meetingCode].forEach(elem => {
                    io.to(elem).emit("reaction", emoji, socket.id);
                });
            }
        });

        socket.on("raise-hand", (isRaised) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                connections[userData.meetingCode].forEach(elem => {
                    io.to(elem).emit("raise-hand", isRaised, socket.id);
                });
            }
        });

        socket.on("create-poll", (pollData) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                connections[userData.meetingCode].forEach(elem => {
                    io.to(elem).emit("poll-created", { ...pollData, id: socket.id + Date.now() });
                });
            }
        });

        socket.on("vote", (pollId, optionIndex) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                connections[userData.meetingCode].forEach(elem => {
                    io.to(elem).emit("poll-voted", pollId, optionIndex);
                });
            }
        });

        socket.on("breakout-rooms", (roomsConfig) => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                connections[userData.meetingCode].forEach(elem => {
                    io.to(elem).emit("breakout-rooms-config", roomsConfig);
                });
            }
        });

        socket.on("disconnect", async () => {
            const userData = socketUserMap[socket.id];
            if (userData) {
                const { username, meetingCode } = userData;
                const startTime = timeOnline[socket.id];
                const endTime = new Date();
                const diffTime = Math.abs(endTime - startTime);
                const durationInSeconds = Math.floor(diffTime / 1000);

                // Save to Analytics
                try {
                    const participantCount = connections[meetingCode] ? connections[meetingCode].length : 0;
                    const newAnalytics = new Analytics({
                        user_id: username,
                        meetingCode: meetingCode,
                        startTime: startTime,
                        endTime: endTime,
                        duration: durationInSeconds,
                        participantCount: participantCount
                    });
                    await newAnalytics.save();
                    console.log(`Saved analytics for ${username}: ${durationInSeconds}s`);
                } catch (err) {
                    console.error("Error saving analytics:", err);
                }

                // Remove from connections
                if (connections[meetingCode]) {
                    const index = connections[meetingCode].indexOf(socket.id);
                    if (index > -1) {
                        connections[meetingCode].splice(index, 1);
                        
                        // If host leaves, assign new host
                        if (meetingHosts[meetingCode] === socket.id) {
                            if (connections[meetingCode].length > 0) {
                                meetingHosts[meetingCode] = connections[meetingCode][0];
                                io.to(meetingHosts[meetingCode]).emit("is-host", true);
                            } else {
                                delete meetingHosts[meetingCode];
                                delete lockedMeetings[meetingCode];
                                delete waitingQueue[meetingCode];
                            }
                        }

                        connections[meetingCode].forEach(elem => {
                            io.to(elem).emit('user-left', socket.id);
                        });
                        if (connections[meetingCode].length === 0) {
                            delete connections[meetingCode];
                        }
                    }
                }
                
                // Remove from waiting queue if present
                if (waitingQueue[meetingCode]) {
                    waitingQueue[meetingCode] = waitingQueue[meetingCode].filter(id => id !== socket.id);
                }

                delete socketUserMap[socket.id];
                delete timeOnline[socket.id];
            }
        })
    })

    return io;
}

