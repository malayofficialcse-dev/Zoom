import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/connect.js";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

// Serve static files from the React frontend app
const frontendPath = path.join(__dirname, "../../frontend/build");
app.use(express.static(frontendPath));

// AFTER all other routes, handle any that don't match with index.html
// app.get("*", (req, res) => {
//     res.sendFile(path.join(frontendPath, "index.html"));
// });

app.get('/',(req,res)=>{
    res.send("Zoom backend is ok");
})

const start = async () => {
    try {
        await connectDB();
        server.listen(app.get("port"), () => {
            console.log("LISTENIN ON PORT 8000")
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
}

start();