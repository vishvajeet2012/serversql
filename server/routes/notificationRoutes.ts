// routes/notificationRoutes.ts
import express from "express";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controlers/notificationController";
import { authenticateJWT } from "../middleware/auth";

const router = express.Router();

router.get("/getallnotification", authenticateJWT, getUserNotifications);
router.post("/notification_id/read", authenticateJWT, markNotificationAsRead);
router.put("/read-all", authenticateJWT, markAllNotificationsAsRead);
router.delete("/notification_id", authenticateJWT, deleteNotification);

export default router;
