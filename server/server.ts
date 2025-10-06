

// import AuthRoutes from "./routes/AuthRoutes";
// import UserRoutes from "./routes/UserRoutes";
// import TeachRoutes from "./routes/teacherRoutes";
// import StudentRoutes from "
// import express, { Request, Response } from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import http from "http";
// import { Server as SocketIOServer } from "socket.io";
// import cron from "node-cron";
// import jwt from "jsonwebtoken";

// import { checkUpcomingTests } from "./jobs/notificationJobs";

// dotenv.config();

// const app = express();
// const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

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
// app.use("/api/notifications", NotificationRoutes);

// app.get("/", (req: Request, res: Response) => {
//   res.send("🚀 Express + Vercel running successfully!");
// });

// const server = http.createServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });

// // Socket.io authentication middleware
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;

//   if (!token) {
//     return next(new Error("Authentication error: Token required"));
//   }

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET) as any;
//     socket.data.user = decoded;
//     next();
//   } catch (err) {
//     next(new Error("Authentication error: Invalid token"));
//   }
// });

// // Socket.io connection handling
// io.on("connection", (socket) => {
//   const user = socket.data.user;
//   console.log(`User connected: ${user.email} (ID: ${user.userId})`);

//   // Join user-specific room
//   socket.join(`user_${user.userId}`);

//   // Join role-specific room
//   socket.join(`role_${user.role}`);

//   socket.on("disconnect", () => {
//     console.log(`User disconnected: ${user.email}`);
//   });

//   // Mark notification as read
//   socket.on("mark_notification_read", async (notificationId: number) => {
//     try {
//       // Update notification in database (implement in controller)
//       io.to(`user_${user.userId}`).emit("notification_marked_read", {
//         notification_id: notificationId,
//       });
//     } catch (error) {
//       console.error("Error marking notification as read:", error);
//     }
//   });
// });

// // Cron job: Check for upcoming tests (runs daily at 8 AM)
// cron.schedule("0 8 * * *", () => {
//   console.log("Running scheduled job: Check upcoming tests");
//   checkUpcomingTests(io);
// });
// // cron.schedule("* * * * *", () => {
// //   console.log("Running scheduled job every 1 minute");
// //   checkUpcomingTests(io);
// // });

// export { io };

// const port = process.env.PORT || 5000;
// server.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });

// export default app;


// import AuthRoutes from "./routes/AuthRoutes";
// import UserRoutes from "./routes/UserRoutes";
//  import TeachRoutes from "./routes/teacherRoutes";
//  import StudentRoutes from "./routes/studentroutes";
// import NotificationRoutes from "./routes/notificationRoutes";


// import express, { Request, Response } from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import http from "http";
// import { Server as SocketIOServer } from "socket.io";
// import jwt from "jsonwebtoken";

// dotenv.config();

// const app = express();
// const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// app.use(cors());
// app.use(express.json());

// // Your routes...
// app.use("/api/auth", AuthRoutes);
// app.use("/api/user", UserRoutes);
// app.use("/api/teacher", TeachRoutes);
// app.use("/api/student", StudentRoutes);
// app.use("/api/notifications", NotificationRoutes);

// const server = http.createServer(app);

// // CRITICAL: Socket.IO configuration for Render.com
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: "*", // In production, specify your React Native app domains
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
//   // Allow both WebSocket and polling
//   transports: ['websocket', 'polling'],
//   // Render-specific settings
//   allowEIO3: true,
//   pingTimeout: 60000,
//   pingInterval: 25000,
// });

// // Socket authentication middleware
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;

//   if (!token) {
//     console.log('No token provided');
//     return next(new Error('Authentication error: Token required'));
//   }

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET) as any;
//     socket.data.user = decoded;
//     console.log('User authenticated:', decoded.email);
//     next();
//   } catch (err) {
//     console.log('Token verification failed:', err);
//     next(new Error('Authentication error: Invalid token'));
//   }
// });

// // Socket connection handling
// io.on("connection", (socket) => {
//   const user = socket.data.user;
//   console.log(`✅ User connected: ${user.email} (ID: ${user.userId})`);

//   socket.join(`user_${user.userId}`);
//   socket.join(`role_${user.role}`);

//   socket.on("disconnect", (reason) => {
//     console.log(`❌ User disconnected: ${user.email} - Reason: ${reason}`);
//   });

//   // Handle mark notification as read
//   socket.on("mark_notification_read", async (notificationId: number) => {
//     try {
//       io.to(`user_${user.userId}`).emit("notification_marked_read", {
//         notification_id: notificationId,
//       });
//     } catch (error) {
//       console.error("Error marking notification as read:", error);
//     }
//   });
// });

// export { io };

// // Render uses PORT environment variable
// const port = process.env.PORT || 5000;
// server.listen(port, () => {
//   console.log(`🚀 Server running on port ${port}`);
//   console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
// });

// export default app;



import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import AuthRoutes from "./routes/AuthRoutes";
import UserRoutes from "./routes/UserRoutes";
import TeachRoutes from "./routes/teacherRoutes";
import StudentRoutes from "./routes/studentroutes";
import NotificationRoutes from "./routes/notificationRoutes";

// Initialize Firebase Admin
import "./config/firebase-admin";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "School Management API with Firebase FCM",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/teacher", TeachRoutes);
app.use("/api/student", StudentRoutes);
app.use("/api/notifications", NotificationRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Firebase FCM initialized`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default app;
