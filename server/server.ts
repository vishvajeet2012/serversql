import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import AuthRoutes from "./routes/AuthRoutes";
import UserRoutes from "./routes/UserRoutes";
import TeachRoutes from "./routes/teacherRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (err) {
        console.error("Invalid JSON received:", buf.toString());
        throw err;
      }
    },
  })
);

app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/teacher", TeachRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Express + Vercel running successfully!");
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Add more socket events here as needed
});

const port = 5000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
