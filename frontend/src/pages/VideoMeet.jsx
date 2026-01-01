import React, { useEffect, useRef, useState, useCallback } from 'react'
import io from "socket.io-client";
import server from '../environment';
import Whiteboard from '../components/Whiteboard';
import ThemeToggle from '../components/ThemeToggle';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState();
    let [showModal, setModal] = useState(false);
    let [showWhiteboard, setShowWhiteboard] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([])
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    const videoRef = useRef([])
    let [videos, setVideos] = useState([])
    let [reactions, setReactions] = useState([]);
    let [raisedHands, setRaisedHands] = useState({});
    let [polls, setPolls] = useState([]);
    let [showPolls, setShowPolls] = useState(false);
    let [breakoutRooms, setBreakoutRooms] = useState([]);
    let [showBreakout, setShowBreakout] = useState(false);
    let [isHost, setIsHost] = useState(false);
    let [isLocked, setIsLocked] = useState(false);
    let [isWaiting, setIsWaiting] = useState(false);
    let [waitingUsers, setWaitingUsers] = useState([]);
    let [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const silence = useCallback(() => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }, [])

    const black = useCallback(({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }, [])

    const addMessage = useCallback((data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    }, []);

    const gotMessageFromServer = useCallback((fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }, []);

    const getUserMediaSuccess = useCallback((stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream
            }

            for (let id in connections) {
                window.localStream.getTracks().forEach(track => {
                    // Try to replace track if it already exists, otherwise add it
                    const senders = connections[id].getSenders();
                    const sender = senders.find(s => s.track && s.track.kind === track.kind);
                    if (sender) {
                        sender.replaceTrack(track);
                    } else {
                        connections[id].addTrack(track, window.localStream);
                    }
                });

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }, [black, silence]);

    const getUserMedia = useCallback(() => {
        // Only request what is actually available and toggled on
        const constraints = {
            video: video && videoAvailable,
            audio: audio && audioAvailable
        };

        if (constraints.video || constraints.audio) {
            navigator.mediaDevices.getUserMedia(constraints)
                .then(getUserMediaSuccess)
                .catch((e) => {
                    console.error("getUserMedia error:", e);
                    // Fallback to what might work if both failed
                    if (constraints.video && constraints.audio) {
                        console.log("Retrying with audio only...");
                        navigator.mediaDevices.getUserMedia({ audio: true }).then(getUserMediaSuccess).catch(err => console.log(err));
                    }
                });
        } else {
            try {
                if (localVideoref.current && localVideoref.current.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { }
        }
    }, [video, videoAvailable, audio, audioAvailable, getUserMediaSuccess]);

    const getDisplayMediaSuccess = useCallback((stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e) }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            stream.getTracks().forEach(track => {
                const senders = connections[id].getSenders();
                const sender = senders.find(s => s.track && s.track.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track);
                } else {
                    connections[id].addTrack(track, stream);
                }
            });

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);
            try {
                if (localVideoref.current && localVideoref.current.srcObject) {
                    localVideoref.current.srcObject.getTracks().forEach(t => t.stop());
                }
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence();
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            getUserMedia();
        })
    }, [black, silence, getUserMedia]);

    const getDisplayMedia = useCallback(() => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDisplayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }, [screen, getDisplayMediaSuccess])

    const getPermissions = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (stream) {
                setVideoAvailable(true);
                setAudioAvailable(true);
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (e) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoStream) {
                    setVideoAvailable(true);
                    videoStream.getTracks().forEach(track => track.stop());
                }
            } catch (ve) {
                setVideoAvailable(false);
                console.log("Video not available", ve);
            }

            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (audioStream) {
                    setAudioAvailable(true);
                    audioStream.getTracks().forEach(track => track.stop());
                }
            } catch (ae) {
                setAudioAvailable(false);
                console.log("Audio not available", ae);
            }
        }

        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        } else {
            setScreenAvailable(false);
        }
    }, []);

    const connectToSocketServer = useCallback(() => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href, username)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('is-host', (status) => setIsHost(status));
            socketRef.current.on('meeting-locked', (status) => setIsLocked(status));
            socketRef.current.on('waiting-room-status', (status) => setIsWaiting(status));
            socketRef.current.on('waiting-user', (user) => {
                setWaitingUsers(prev => [...prev, user]);
            });
            socketRef.current.on('force-mute', () => {
                setAudio(false);
                if (window.localStream) {
                    window.localStream.getAudioTracks().forEach(track => track.enabled = false);
                }
            });
            socketRef.current.on('kicked', () => {
                alert("You have been removed from the meeting by the host.");
                window.location.href = "/home";
            });

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients, clientsInfo) => {
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    if (connections[socketListId]) return;

                    const userRecord = clientsInfo.find(c => c.socketId === socketListId);
                    const remoteUsername = userRecord ? userRecord.username : `User ${socketListId.substring(0, 4)}`;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    connections[socketListId].ontrack = (event) => {
                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);
                        const incomingStream = event.streams[0];

                        if (videoExists) {
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: incomingStream, username: remoteUsername } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: incomingStream,
                                autoplay: true,
                                playsinline: true,
                                username: remoteUsername
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    if (window.localStream !== undefined && window.localStream !== null) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        
                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })

            socketRef.current.on('reaction', (emoji, fromId) => {
                const reactionId = Date.now() + Math.random();
                setReactions(prev => [...prev, { emoji, id: reactionId, fromId }]);
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== reactionId));
                }, 4000);
            });

            socketRef.current.on('raise-hand', (isRaised, fromId) => {
                setRaisedHands(prev => ({ ...prev, [fromId]: isRaised }));
            });

            socketRef.current.on('poll-created', (poll) => {
                setPolls(prev => [...prev, { ...poll, votes: {} }]);
                setShowPolls(true);
            });

            socketRef.current.on('poll-voted', (pollId, optionIndex) => {
                setPolls(prev => prev.map(p => p.id === pollId ? {
                    ...p,
                    options: p.options.map((opt, i) => i === optionIndex ? { ...opt, votes: (opt.votes || 0) + 1 } : opt)
                } : p));
            });

            socketRef.current.on('breakout-rooms-config', (rooms) => {
                setBreakoutRooms(rooms);
                setShowBreakout(true);
            });
        })
    }, [addMessage, gotMessageFromServer, username, black, silence]);

    const getMedia = useCallback(() => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }, [videoAvailable, audioAvailable, connectToSocketServer]);

    const handleEndCall = useCallback(() => {
        try {
            if (localVideoref.current && localVideoref.current.srcObject) {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            }
        } catch (e) { }
        window.location.href = "/home"
    }, []);

    const sendMessage = useCallback(() => {
        if (message.trim()) {
            socketRef.current.emit('chat-message', message, username)
            setMessage("");
        }
    }, [message, username]);

    const sendReaction = (emoji) => {
        socketRef.current.emit('reaction', emoji);
    };

    const toggleHandRaise = () => {
        const currentStatus = !!raisedHands[socketIdRef.current];
        const newStatus = !currentStatus;
        setRaisedHands(prev => ({ ...prev, [socketIdRef.current]: newStatus }));
        socketRef.current.emit('raise-hand', newStatus);
    };

    const createPoll = (question, options) => {
        const pollData = {
            question,
            options: options.map(opt => ({ text: opt, votes: 0 })),
            creator: username
        };
        socketRef.current.emit('create-poll', pollData);
    };

    const hostMuteAll = () => socketRef.current.emit("mute-all");
    const hostKickUser = (id) => socketRef.current.emit("kick-user", id);
    const hostLockMeeting = () => {
        const nextStatus = !isLocked;
        setIsLocked(nextStatus);
        socketRef.current.emit("lock-meeting", nextStatus);
    };
    const admitUser = (id) => {
        setWaitingUsers(prev => prev.filter(u => u.socketId !== id));
        socketRef.current.emit("admit-user", id);
    };

    const startRecording = useCallback(() => {
        const stream = localVideoref.current.srcObject;
        if (!stream) return;

        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `meeting-record-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    }, []);

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    const votePoll = (pollId, optionIndex) => {
        socketRef.current.emit('vote', pollId, optionIndex);
    };

    const startBreakoutRooms = (numRooms) => {
        const rooms = [];
        for (let i = 1; i <= numRooms; i++) {
            rooms.push({ id: i, code: Math.random().toString(36).substring(2, 10).toUpperCase() });
        }
        socketRef.current.emit('breakout-rooms', rooms);
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (localVideoref.current) {
                await localVideoref.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error("PiP Error:", error);
        }
    };

    const handleVideo = () => setVideo(!video);
    const handleAudio = () => setAudio(!audio);
    const handleScreen = () => setScreen(!screen);

    const connect = () => {
        if (username.trim()) {
            setAskForUsername(false);
            getMedia();
        }
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        getPermissions();
    }, [getPermissions])

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio, getUserMedia])

    useEffect(() => {
        if (screen !== undefined) {
            getDisplayMedia();
        }
    }, [screen, getDisplayMedia])


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-outfit text-slate-900 dark:text-white transition-colors duration-300 flex flex-col overflow-hidden">
            
            {isWaiting && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-orange-600/20 rounded-full blur-[128px]"></div>
                    </div>
                    <div className="relative z-10 text-center space-y-8 max-w-lg">
                        <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-orange-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black tracking-tight">Waiting Room</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">The host has been notified. They will admit you to the meeting shortly. Please stay on this page.</p>
                        </div>
                    </div>
                </div>
            )}

            {isLocked && !isHost && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-rose-600/20 rounded-full blur-[128px]"></div>
                    </div>
                    <div className="relative z-10 text-center space-y-8 max-w-lg">
                        <div className="w-32 h-32 mx-auto flex items-center justify-center bg-rose-500/10 rounded-full text-rose-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black tracking-tight text-rose-500 uppercase italic">Meeting Locked</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">The host has locked this meeting. No more participants can join at this time.</p>
                            <button onClick={() => window.location.href = "/home"} className="px-8 py-4 bg-slate-200 dark:bg-slate-800 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">Go back Home</button>
                        </div>
                    </div>
                </div>
            )}
            
            {askForUsername === true ? (
                <div className="flex-1 flex items-center justify-center p-6 relative">
                    
                    {/* Background Effects */}
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-[128px]"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-orange-600/10 dark:bg-orange-600/10 rounded-full blur-[128px]"></div>
                    </div>

                    <div className="absolute top-8 right-8 z-50">
                        <ThemeToggle />
                    </div>

                    <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-10 animate-fade-in-up">
                            <div className="space-y-4">
                                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Join the <span className="bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent italic">Conversation.</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                                    Set up your camera and microphone to ensure a smooth video calling experience.
                                </p>
                            </div>

                            <div className="space-y-6 bg-white dark:bg-slate-900/40 p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 backdrop-blur-2xl">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Your Identity</label>
                                    <input 
                                        type="text" 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-xl placeholder-slate-300 dark:placeholder-slate-700"
                                        placeholder="What should we call you?"
                                        onKeyPress={(e) => e.key === 'Enter' && connect()}
                                    />
                                </div>
                                <button 
                                    onClick={connect}
                                    className="w-full py-5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-2xl font-black text-white shadow-2xl shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg tracking-wide uppercase"
                                    disabled={!username.trim()}
                                >
                                    Enter Meeting Room
                                </button>
                                
                                <div className="flex items-center justify-center gap-8 pt-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${videoAvailable ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Camera</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${audioAvailable ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Microphone</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group perspective-1000 animate-fade-in-left">
                            <div className="absolute -inset-6 bg-gradient-to-tr from-orange-500/20 to-purple-600/20 rounded-[3.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                            <div className="relative aspect-video rounded-[3rem] bg-slate-200 dark:bg-slate-900 border-4 border-white dark:border-slate-800 overflow-hidden shadow-2xl transform transition-transform duration-700 hover:rotate-y-6">
                                <video 
                                    ref={localVideoref} 
                                    autoPlay 
                                    muted 
                                    playsInline
                                    className="w-full h-full object-cover mirror"
                                />
                                {!videoAvailable && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 dark:bg-slate-950/80 backdrop-blur-md">
                                        <div className="text-center space-y-4">
                                            <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs">Camera Access Required</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden relative theme-transition">
                    
                    {/* Video Area */}
                    <div className="flex-1 relative flex flex-col p-4 md:p-6 lg:p-8">
                        
                        {/* Status Bar */}
                        <div className="absolute top-8 left-8 z-20 flex items-center gap-4">
                             <div className="px-4 py-2 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl flex items-center gap-3">
                                 <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                 <span className="text-xs font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Live Meeting</span>
                                 <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                                 <span className="text-xs font-bold text-slate-700 dark:text-white">{videos.length + 1} Participants</span>
                             </div>
                        </div>

                        <div className="absolute top-8 right-8 z-20 hidden md:block">
                            <ThemeToggle />
                        </div>
                        
                        {/* Video Grid */}
                        <div className={`flex-1 grid gap-4 p-2 md:p-6 ${
                            videos.length === 0 ? 'grid-cols-1' : 
                            videos.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 
                            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        } overflow-y-auto no-scrollbar content-center justify-items-center`}>
                            
                            {/* Local Video */}
                            <div className="relative w-full aspect-video md:aspect-[4/3] lg:aspect-video rounded-2xl md:rounded-[2.5rem] bg-slate-200 dark:bg-slate-900 border-2 md:border-4 border-white dark:border-slate-800 overflow-hidden group shadow-2xl transition-all duration-500 hover:scale-[1.01]">
                                <video 
                                    ref={localVideoref} 
                                    autoPlay 
                                    muted 
                                    playsInline
                                    className="w-full h-full object-cover mirror"
                                />
                                <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-xl text-xs font-black text-white border border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    {username} (You)
                                </div>
                                 {(!video || !videoAvailable) && (
                                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center gap-6">
                                        <div className="w-24 h-24 rounded-[2rem] bg-rose-500/5 flex items-center justify-center text-rose-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                            </svg>
                                        </div>
                                         <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Camera Disabled</p>
                                    </div>
                                )}
                                {raisedHands[socketIdRef.current] && (
                                    <div className="absolute top-6 right-6 w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-2xl animate-bounce border-4 border-white dark:border-slate-800">
                                        <span className="text-2xl">✋</span>
                                    </div>
                                )}
                            </div>

                            {/* Remote Videos */}
                            {videos.map((v) => (
                                <div key={v.socketId} className="relative w-full aspect-video md:aspect-[4/3] lg:aspect-video rounded-2xl md:rounded-[2.5rem] bg-slate-200 dark:bg-slate-900 border-2 md:border-4 border-white dark:border-slate-800 overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01]">
                                    <video
                                        data-socket={v.socketId}
                                        ref={ref => {
                                            if (ref && v.stream) {
                                                ref.srcObject = v.stream;
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    {(!v.stream || v.stream.getVideoTracks().length === 0) && (
                                        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center gap-6">
                                            <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-3xl font-black">
                                                {v.username ? v.username.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No Video Signal</p>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 px-3 py-1 md:px-4 md:py-2 bg-black/40 backdrop-blur-xl rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-white border border-white/10">
                                         {v.username || `PARTICIPANT ${v.socketId.substring(0, 4).toUpperCase()}`}
                                    </div>
                                    {raisedHands[v.socketId] && (
                                        <div className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-2xl animate-bounce border-2 md:border-4 border-white dark:border-slate-800">
                                            <span className="text-xl md:text-2xl">✋</span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Floating Reactions Overlay */}
                            <div className="absolute inset-0 pointer-events-none z-[100]">
                                {reactions.map(r => (
                                    <div 
                                        key={r.id} 
                                        className="absolute bottom-40 text-6xl animate-float-up"
                                        style={{ left: `${Math.random() * 80 + 10}%` }}
                                    >
                                        {r.emoji}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Whiteboard Overlay */}
                        {showWhiteboard && (
                            <div className="absolute inset-4 md:inset-8 z-50 animate-in zoom-in duration-300">
                                <Whiteboard socket={socketRef.current} />
                                <button 
                                    onClick={() => setShowWhiteboard(false)}
                                    className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Control Bar */}
                        <div className="mt-8 flex flex-col items-center gap-6 relative z-30">
                            
                            {/* Waitlist Notification for Host */}
                            {isHost && waitingUsers.length > 0 && (
                                <div className="animate-bounce-subtle bg-white dark:bg-slate-900 border border-orange-500/20 px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 backdrop-blur-3xl">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-3 h-3 bg-orange-500 rounded-full animate-ping absolute -top-1 -right-1"></div>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-orange-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v9m-8-9v9m-8-9v9M5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H5.25a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 5.25 4.5Z" />
                                            </svg>
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-widest">{waitingUsers.length} person waiting</span>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
                                    <div className="flex gap-4">
                                        {waitingUsers.map(u => (
                                            <div key={u.socketId} className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 pl-4 pr-2 py-2 rounded-xl border border-slate-200 dark:border-white/5">
                                                <span className="text-xs font-bold">{u.username}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => admitUser(u.socketId)} className="p-2 bg-green-500 text-white rounded-lg hover:scale-110 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></button>
                                                    <button onClick={() => hostKickUser(u.socketId)} className="p-2 bg-rose-500 text-white rounded-lg hover:scale-110 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="h-20 md:h-24 max-w-[95vw] overflow-x-auto no-scrollbar flex items-center justify-start md:justify-center gap-2 md:gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 px-4 md:px-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                
                                <button 
                                    onClick={handleAudio}
                                    title={audio ? "Mute Mic" : "Unmute Mic"}
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform hover:scale-110 active:scale-90 flex-shrink-0 ${audio ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'}`}
                                >
                                    {audio ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3zM3 3l18 18" />
                                        </svg>
                                    )}
                                </button>

                                <button 
                                    onClick={handleVideo}
                                    title={video ? "Turn Camera Off" : "Turn Camera On"}
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform hover:scale-110 active:scale-90 flex-shrink-0 ${video ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'}`}
                                >
                                    {video ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841-3.159a2.25 2.25 0 0 1 3.159 3.159l-11.4 11.4a2.25 2.25 0 0 1-3.159-3.159l11.4-11.4Z" />
                                        </svg>
                                    )}
                                </button>

                                <button 
                                    onClick={handleEndCall}
                                    title="Leave Meeting"
                                    className="p-4 md:p-5 rounded-2xl md:rounded-3xl bg-rose-600 hover:bg-rose-700 text-white transition-all transform hover:scale-110 md:hover:scale-125 md:hover:-rotate-12 active:scale-95 shadow-xl shadow-rose-600/30 flex-shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                                      <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {screenAvailable && (
                                    <button 
                                        onClick={handleScreen}
                                        title={screen ? "Stop Presenting" : "Present Screen"}
                                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform hover:scale-110 active:scale-90 flex-shrink-0 ${screen ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                        </svg>
                                    </button>
                                )}

                                <button 
                                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                                    title="Open Whiteboard"
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform hover:scale-110 active:scale-90 flex-shrink-0 ${showWhiteboard ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                </button>

                                 <button 
                                    onClick={() => { setModal(!showModal); setNewMessages(0); }}
                                    title="Chat"
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all relative transform hover:scale-110 active:scale-90 flex-shrink-0 ${showModal ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h3m-6.75 4.125h12c.345 0 .679-.038 1-.11a12.871 12.871 0 0 1-3.158-1.78l-4.508-2.93a1.5 1.5 0 0 0-1.666 0l-4.508 2.93a12.87 12.87 0 0 1-3.158 1.78c.321.072.655.11 1 .11Z" />
                                    </svg>
                                    {newMessages > 0 && !showModal && (
                                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-4 border-white dark:border-slate-900 animate-bounce">
                                            {newMessages}
                                        </span>
                                    )}
                                </button>

                                <button 
                                    onClick={toggleHandRaise}
                                    title="Raise Hand"
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all relative transform hover:scale-110 active:scale-90 flex-shrink-0 ${raisedHands[socketIdRef.current] ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <span className="text-xl">✋</span>
                                </button>

                                <div className="group relative flex-shrink-0">
                                    <button 
                                        className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all transform hover:scale-110 active:scale-90"
                                    >
                                        <span className="text-xl">😊</span>
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all flex gap-2">
                                        {['❤️', '👏', '🔥', '🎉', '😂', '😮'].map(emoji => (
                                            <button 
                                                key={emoji}
                                                onClick={() => sendReaction(emoji)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all hover:scale-125"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setShowPolls(!showPolls)}
                                    title="Polls & Q&A"
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all relative transform hover:scale-110 active:scale-90 flex-shrink-0 ${showPolls ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                    </svg>
                                </button>

                                <button 
                                    onClick={() => setShowBreakout(!showBreakout)}
                                    title="Breakout Rooms"
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all relative transform hover:scale-110 active:scale-90 flex-shrink-0 ${showBreakout ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                    </svg>
                                </button>

                                <button 
                                    onClick={togglePiP}
                                    title="Picture in Picture"
                                    className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all transform hover:scale-110 active:scale-90 flex-shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
                                    </svg>
                                </button>

                                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2 flex-shrink-0"></div>

                                <button 
                                    onClick={isRecording ? stopRecording : startRecording}
                                    title={isRecording ? "Stop Recording" : "Record Meeting"}
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform hover:scale-110 active:scale-90 flex-shrink-0 ${isRecording ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <div className="relative">
                                        {isRecording && <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                                          <circle cx="12" cy="12" r="8" />
                                        </svg>
                                    </div>
                                </button>

                                {isHost && (
                                    <div className="flex gap-2 md:gap-4 flex-shrink-0">
                                        <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
                                        <button 
                                            onClick={hostMuteAll}
                                            title="Mute Everyone"
                                            className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-rose-500 hover:text-white transition-all transform hover:scale-110 active:scale-90 flex-shrink-0"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.5a2.25 2.25 0 0 1-2.25-2.25V9a2.25 2.25 0 0 1 2.25-2.25h2.25Z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={hostLockMeeting}
                                            title={isLocked ? "Unlock Meeting" : "Lock Meeting"}
                                            className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform hover:scale-110 active:scale-90 flex-shrink-0 ${isLocked ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat Sidebar */}
                    <div className={`fixed lg:relative inset-y-0 right-0 w-80 lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 transform transition-transform duration-500 z-50 flex flex-col shadow-2xl ${showModal ? 'translate-x-0' : 'translate-x-full lg:hidden'}`}>
                        <div className="p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight">Messages</h3>
                            <button onClick={() => setModal(false)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-6">
                                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-widest text-center">No messages yet</p>
                                </div>
                            ) : (
                                messages.map((item, index) => (
                                    <div key={index} className={`flex flex-col ${item.sender === username ? 'items-end' : 'items-start'} space-y-2`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{item.sender}</span>
                                            <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold leading-none">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`px-5 py-3 rounded-2xl max-w-[90%] text-sm font-medium shadow-sm leading-relaxed ${item.sender === username ? 'bg-gradient-to-tr from-orange-500 to-orange-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-white/5'}`}>
                                            {item.data}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border-t border-slate-200 dark:border-white/5">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-sm"
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                />
                                <button 
                                    onClick={sendMessage}
                                    className="absolute right-2 top-2 p-2.5 bg-gradient-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Polls & Q&A Sidebar */}
                    <div className={`fixed lg:relative inset-y-0 right-0 w-80 lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 transform transition-transform duration-500 z-50 flex flex-col shadow-2xl ${showPolls ? 'translate-x-0' : 'translate-x-full hidden'}`}>
                        <div className="p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight text-purple-500">Polls & Q&A</h3>
                            <button onClick={() => setShowPolls(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Poll Creation Form (Simple implementation) */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-white/5 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Host Actions</h4>
                                <button 
                                    onClick={() => {
                                        const q = prompt("Enter Question:");
                                        const ops = prompt("Enter Options (comma separated):");
                                        if (q && ops) createPoll(q, ops.split(","));
                                    }}
                                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-600/20"
                                >
                                    Create New Poll
                                </button>
                            </div>

                            <div className="space-y-6">
                                {[...polls].reverse().map((poll, idx) => (
                                    <div key={poll.id || idx} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">New Poll</p>
                                            <h5 className="text-lg font-black leading-tight">{poll.question}</h5>
                                        </div>
                                        <div className="space-y-3">
                                            {poll.options.map((opt, i) => {
                                                const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
                                                const percentage = totalVotes === 0 ? 0 : Math.round(((opt.votes || 0) / totalVotes) * 100);
                                                
                                                return (
                                                    <button 
                                                        key={i}
                                                        onClick={() => votePoll(poll.id, i)}
                                                        className="w-full text-left group"
                                                    >
                                                        <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2 px-1">
                                                            <span className="text-slate-500 dark:text-slate-400 group-hover:text-purple-500 transition-colors">{opt.text}</span>
                                                            <span className="text-purple-500">{percentage}%</span>
                                                        </div>
                                                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-1000"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 italic">Asked by {poll.creator}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Breakout Rooms Sidebar */}
                    <div className={`fixed lg:relative inset-y-0 right-0 w-80 lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 transform transition-transform duration-500 z-50 flex flex-col shadow-2xl ${showBreakout ? 'translate-x-0' : 'translate-x-full hidden'}`}>
                        <div className="p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight text-indigo-500">Breakout Rooms</h3>
                            <button onClick={() => setShowBreakout(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-white/5 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Host Management</h4>
                                <button 
                                    onClick={() => {
                                        const num = prompt("How many rooms?");
                                        if (num) startBreakoutRooms(parseInt(num));
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    Split into New Rooms
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Available Rooms</h4>
                                {breakoutRooms.length === 0 ? (
                                    <p className="text-sm font-medium text-slate-500 text-center py-8">No breakout rooms started yet.</p>
                                ) : (
                                    breakoutRooms.map((room) => (
                                        <div key={room.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Room {room.id}</p>
                                                <p className="text-lg font-black tracking-tight uppercase font-mono">{room.code}</p>
                                            </div>
                                            <button 
                                                onClick={() => window.open(`/${room.code}`, '_blank')}
                                                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-500 group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Join
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .mirror {
                    transform: scaleX(-1);
                }
                .animate-float-up {
                    animation: float-up 4s ease-out forwards;
                }
                @keyframes float-up {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    10% { opacity: 1; transform: translateY(-20px) scale(1.2); }
                    100% { transform: translateY(-400px) scale(1); opacity: 0; }
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                .rotate-y-6 {
                    transform: rotateY(6deg);
                }
                .rotate-y-12 {
                    transform: rotateY(12deg);
                }
                .theme-transition {
                    transition: background-color 0.5s ease, color 0.5s ease;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-left {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .animate-fade-in-left {
                    animation: fade-in-left 1s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    )
}
