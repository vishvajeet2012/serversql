import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";
import {
  sendPushNotification,
  sendBulkNotifications,
  sendSilentDataMessage,
} from "../util/sendNotifcationfireBase";

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
      take: 50,
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

export const markNotificationAsRead = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { notification_id } = req.body;

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

    await prisma.notifications.update({
      where: { notification_id: parseInt(notification_id ?? "0") },
      data: { is_read: true },
    });

    const unreadCount = await prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { push_token: true },
    });

    if (user?.push_token) {
      await sendSilentDataMessage({
        token: user.push_token,
        data: {
          type: "badge_update",
          badge_count: unreadCount.toString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { push_token: true },
    });

    if (user?.push_token) {
      await sendSilentDataMessage({
        token: user.push_token,
        data: {
          type: "badge_update",
          badge_count: "0",
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unread_count: 0,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteNotification = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { notification_id } = req.body;

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
      where: { notification_id: parseInt(notification_id ?? "0") },
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

export const createAndSendNotification = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user_id, title, message, image_url } = req.body;

    if (!user_id || !title || !message) {
      res.status(400).json({
        error: "user_id, title, and message are required",
      });
      return;
    }

    const notification = await prisma.notifications.create({
      data: {
        user_id: parseInt(user_id),
        title,
        message,
        is_read: false,
      },
    });

    const user = await prisma.users.findUnique({
      where: { user_id: parseInt(user_id) },
      select: { push_token: true },
    });

    if (user?.push_token) {
      const unreadCount = await prisma.notifications.count({
        where: {
          user_id: parseInt(user_id),
          is_read: false,
        },
      });

      await sendPushNotification({
        token: user.push_token,
        title,
        body: message,
        data: {
          notification_id: notification.notification_id.toString(),
          badge_count: unreadCount.toString(),
        },
        imageUrl: image_url,
        badge: unreadCount,
      });
    }

    res.status(201).json({
      success: true,
      message: "Notification created and sent",
      data: notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendBulkNotificationToUsers = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user_ids, title, message, image_url } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || !title || !message) {
      res.status(400).json({
        error: "user_ids (array), title, and message are required",
      });
      return;
    }

    const notificationData = user_ids.map((userId: number) => ({
      user_id: userId,
      title,
      message,
      is_read: false,
    }));

    await prisma.notifications.createMany({
      data: notificationData,
    });

    const users = await prisma.users.findMany({
      where: {
        user_id: { in: user_ids },
        push_token: { not: null },
      },
      select: { user_id: true, push_token: true },
    });

    const tokens = users
      .map((u) => u.push_token)
      .filter((token): token is string => token !== null);

    if (tokens.length > 0) {
      await sendBulkNotifications({
        tokens,
        title,
        body: message,
        data: {},
        imageUrl: image_url,
      });
    }

    res.status(201).json({
      success: true,
      message: `Notifications sent to ${tokens.length}/${user_ids.length} users`,
      sent_count: tokens.length,
      total_count: user_ids.length,
    });
  } catch (error) {
    console.error("Error sending bulk notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendNotificationToClass = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { class_id, title, message, image_url } = req.body;

    if (!class_id || !title || !message) {
      res.status(400).json({
        error: "class_id, title, and message are required",
      });
      return;
    }

    const students = await prisma.student_profile.findMany({
      where: { class_id: parseInt(class_id) },
      select: { student_id: true },
    });

    if (students.length === 0) {
      res.status(404).json({ error: "No students found in this class" });
      return;
    }

    const userIds = students.map((s) => s.student_id);

    const notificationData = userIds.map((userId) => ({
      user_id: userId,
      title,
      message,
      is_read: false,
    }));

    await prisma.notifications.createMany({
      data: notificationData,
    });

    const users = await prisma.users.findMany({
      where: {
        user_id: { in: userIds },
        push_token: { not: null },
      },
      select: { user_id: true, push_token: true },
    });

    const tokens = users
      .map((u) => u.push_token)
      .filter((token): token is string => token !== null);

    if (tokens.length > 0) {
      await sendBulkNotifications({
        tokens,
        title,
        body: message,
        data: {
          class_id: class_id.toString(),
        },
        imageUrl: image_url,
      });
    }

    res.status(201).json({
      success: true,
      message: `Notifications sent to ${tokens.length}/${userIds.length} students`,
      sent_count: tokens.length,
      total_count: userIds.length,
    });
  } catch (error) {
    console.error("Error sending class notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendNotificationToSection = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { class_id, section_id, title, message, image_url } = req.body;

    if (!class_id || !section_id || !title || !message) {
      res.status(400).json({
        error: "class_id, section_id, title, and message are required",
      });
      return;
    }

    const students = await prisma.student_profile.findMany({
      where: {
        class_id: parseInt(class_id),
        section_id: parseInt(section_id),
      },
      select: { student_id: true },
    });

    if (students.length === 0) {
      res.status(404).json({ error: "No students found in this section" });
      return;
    }

    const userIds = students.map((s) => s.student_id);

    const notificationData = userIds.map((userId) => ({
      user_id: userId,
      title,
      message,
      is_read: false,
    }));

    await prisma.notifications.createMany({
      data: notificationData,
    });

    const users = await prisma.users.findMany({
      where: {
        user_id: { in: userIds },
        push_token: { not: null },
      },
      select: { user_id: true, push_token: true },
    });

    const tokens = users
      .map((u) => u.push_token)
      .filter((token): token is string => token !== null);

    if (tokens.length > 0) {
      await sendBulkNotifications({
        tokens,
        title,
        body: message,
        data: {
          class_id: class_id.toString(),
          section_id: section_id.toString(),
        },
        imageUrl: image_url,
      });
    }

    res.status(201).json({
      success: true,
      message: `Notifications sent to ${tokens.length}/${userIds.length} students`,
      sent_count: tokens.length,
      total_count: userIds.length,
    });
  } catch (error) {
    console.error("Error sending section notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendTestNotification = async (
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

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { push_token: true, name: true },
    });

    if (!user?.push_token) {
      res.status(404).json({
        error: "Push token not found",
        message: "Please update your push token from the app first",
      });
      return;
    }

    const result = await sendPushNotification({
      token: user.push_token,
      title: "🔥 Test Notification",
      body: `Hello ${user.name}! Firebase FCM is working!`,
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
      },
      badge: 1,
    });

    if (result.success) {
      await prisma.notifications.create({
        data: {
          user_id: userId,
          title: "Test Notification",
          message: "Firebase FCM is working!",
          is_read: false,
        },
      });
    }

    res.status(200).json({
      success: result.success,
      message: result.success
        ? "Test notification sent successfully!"
        : "Failed to send test notification",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
