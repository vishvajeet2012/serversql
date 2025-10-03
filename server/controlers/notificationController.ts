import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";

export const getUserNotifications = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { unread_only } = req.query;

    const where: any = { user_id: userId };
    if (unread_only === "true") {
      where.is_read = false;
    }

    const notifications = await prisma.notifications.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      take: 50, // Limit to last 50 notifications
    });

    const unreadCount = await prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { notification_id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const notification = await prisma.notifications.findUnique({
      where: { notification_id: parseInt(notification_id ??"0") },
    });

    if (!notification || notification.user_id !== userId) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    await prisma.notifications.update({
      where: { notification_id: parseInt(notification_id ??"0") },
      data: { is_read: true },
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete notification
export const deleteNotification = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { notification_id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const notification = await prisma.notifications.findUnique({
      where: { notification_id: parseInt(notification_id ?? "0") },
    });

    if (!notification || notification.user_id !== userId) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    await prisma.notifications.delete({
      where: { notification_id:parseInt(notification_id ?? "0") },
    });

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
