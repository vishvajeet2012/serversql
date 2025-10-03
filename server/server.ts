// import express, { Request, Response } from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import { neon } from "@neondatabase/serverless";
// import bcrypt from "bcryptjs";
// import http from "http";
// import { Server as SocketIOServer } from "socket.io";

// import AuthRoutes from "./routes/AuthRoutes";
// import UserRoutes from "./routes/UserRoutes";
// import TeachRoutes from "./routes/teacherRoutes";
// import StudentRoutes from "./routes/studentroutes";

// dotenv.config();

// const app = express();

// app.use(cors());
// app.use(
//   express.json({
//     verify: (req, res, buf) => {
//       try {
//         JSON.parse(buf.toString());
//       } catch (err) {
//         console.error("Invalid JSON received:", buf.toString());
//         throw err;
//       }
//     },
//   })
// );

// app.use("/api/auth", AuthRoutes);
// app.use("/api/user", UserRoutes);
// app.use("/api/teacher", TeachRoutes);
// app.use("/api/student", StudentRoutes);

// app.get("/", (req: Request, res: Response) => {
//   res.send("🚀 Express + Vercel running successfully!");
// });

// const server = http.createServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: "*", // Adjust for production
//     methods: ["GET", "POST"]
//   }
// });

// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });

//   // Add more socket events here as needed
// });

// const port = 5000;
// server.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });

// export default app;

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";
import jwt from "jsonwebtoken";

import AuthRoutes from "./routes/AuthRoutes";
import UserRoutes from "./routes/UserRoutes";
import TeachRoutes from "./routes/teacherRoutes";
import StudentRoutes from "./routes/studentroutes";
import NotificationRoutes from "./routes/notificationRoutes";
import { checkUpcomingTests } from "./jobs/notificationJobs";

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

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
app.use("/api/student", StudentRoutes);
app.use("/api/notifications", NotificationRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Express + Vercel running successfully!");
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: Token required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  const user = socket.data.user;
  console.log(`User connected: ${user.email} (ID: ${user.userId})`);

  // Join user-specific room
  socket.join(`user_${user.userId}`);

  // Join role-specific room
  socket.join(`role_${user.role}`);

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${user.email}`);
  });

  // Mark notification as read
  socket.on("mark_notification_read", async (notificationId: number) => {
    try {
      // Update notification in database (implement in controller)
      io.to(`user_${user.userId}`).emit("notification_marked_read", {
        notification_id: notificationId,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  });
});

// Cron job: Check for upcoming tests (runs daily at 8 AM)
cron.schedule("0 8 * * *", () => {
  console.log("Running scheduled job: Check upcoming tests");
  checkUpcomingTests(io);
});

// Make io accessible globally
export { io };

const port = 5000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Socket.io server ready`);
});

export default app;
