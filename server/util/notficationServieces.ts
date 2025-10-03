// utils/notificationService.ts
import prisma from "../db/prisma";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

interface NotificationData {
  user_id: number;
  title: string;
  message: string;
}

interface BulkNotificationData {
  user_ids: number[];
  title: string;
  message: string;
}

// Create notification in database
export const createNotification = async (data: NotificationData) => {
  try {
    const notification = await prisma.notifications.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        is_read: false,
      },
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Create multiple notifications at once
export const createBulkNotifications = async (data: BulkNotificationData) => {
  try {
    const notifications = data.user_ids.map((user_id) => ({
      user_id,
      title: data.title,
      message: data.message,
      is_read: false,
    }));

    const result = await prisma.notifications.createMany({
      data: notifications,
    });

    return result;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw error;
  }
};

// Send Expo Push Notification
export const sendExpoPushNotification = async (
  expoPushTokens: string[],
  title: string,
  message: string,
  data?: any
) => {
  const messages: ExpoPushMessage[] = [];

  for (const pushToken of expoPushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: "default",
      title: title,
      body: message,
      data: data || {},
      priority: "high",
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  return tickets;
};

// Notify students about new test
export const notifyStudentsAboutNewTest = async (
  classId: number,
  sectionId: number,
  testName: string,
  subject: string,
  dateConducted: Date,
  maxMarks: number,
  io: any
) => {
  try {
    // Get all students in the class and section
    const students = await prisma.student_profile.findMany({
      where: {
        class_id: classId,
        section_id: sectionId,
      },
      select: {
        student_id: true,
        users: {
          select: {
            name: true,
          },
        },
      },
    });

    const studentIds = students.map((s) => s.student_id);

    const title = "📝 New Test Scheduled";
    const message = `${testName} (${subject}) has been scheduled for ${new Date(
      dateConducted
    ).toLocaleDateString()}. Max Marks: ${maxMarks}`;

    // Create notifications in database
    await createBulkNotifications({
      user_ids: studentIds,
      title,
      message,
    });

    // Send real-time Socket.io notifications
    studentIds.forEach((studentId) => {
      io.to(`user_${studentId}`).emit("new_notification", {
        title,
        message,
        type: "test_created",
        created_at: new Date(),
      });
    });

    console.log(`Notified ${studentIds.length} students about new test: ${testName}`);
  } catch (error) {
    console.error("Error notifying students about new test:", error);
  }
};

// Notify student about marks approval
export const notifyStudentAboutMarksApproval = async (
  studentId: number,
  testName: string,
  subject: string,
  marksObtained: number,
  maxMarks: number,
  io: any
) => {
  try {
    const percentage = ((marksObtained / maxMarks) * 100).toFixed(2);
    const title = "✅ Marks Approved";
    const message = `Your marks for ${testName} (${subject}) have been approved. You scored ${marksObtained}/${maxMarks} (${percentage}%)`;

    // Create notification in database
    await createNotification({
      user_id: studentId,
      title,
      message,
    });

    // Send real-time Socket.io notification
    io.to(`user_${studentId}`).emit("new_notification", {
      title,
      message,
      type: "marks_approved",
      marks_obtained: marksObtained,
      max_marks: maxMarks,
      percentage,
      created_at: new Date(),
    });

    console.log(`Notified student ${studentId} about marks approval: ${testName}`);
  } catch (error) {
    console.error("Error notifying student about marks approval:", error);
  }
};

// Notify student about new feedback
export const notifyStudentAboutFeedback = async (
  studentId: number,
  testName: string,
  teacherName: string,
  feedbackMessage: string,
  io: any
) => {
  try {
    const title = "💬 New Feedback Received";
    const message = `${teacherName} gave feedback on ${testName}: "${feedbackMessage.substring(
      0,
      100
    )}${feedbackMessage.length > 100 ? "..." : ""}"`;

    // Create notification in database
    await createNotification({
      user_id: studentId,
      title,
      message,
    });

    // Send real-time Socket.io notification
    io.to(`user_${studentId}`).emit("new_notification", {
      title,
      message,
      type: "feedback_received",
      created_at: new Date(),
    });

    console.log(`Notified student ${studentId} about new feedback on: ${testName}`);
  } catch (error) {
    console.error("Error notifying student about feedback:", error);
  }
};

// Notify students about upcoming test
export const notifyStudentsAboutUpcomingTest = async (
  classId: number,
  sectionId: number,
  testName: string,
  subject: string,
  dateConducted: Date,
  daysRemaining: number,
  io: any
) => {
  try {
    const students = await prisma.student_profile.findMany({
      where: {
        class_id: classId,
        section_id: sectionId,
      },
      select: {
        student_id: true,
      },
    });

    const studentIds = students.map((s) => s.student_id);

    const title = `⏰ Test Reminder - ${daysRemaining} Day${daysRemaining > 1 ? "s" : ""} Left`;
    const message = `${testName} (${subject}) is scheduled on ${new Date(
      dateConducted
    ).toLocaleDateString()}. Prepare well!`;

    // Create notifications in database
    await createBulkNotifications({
      user_ids: studentIds,
      title,
      message,
    });

    // Send real-time Socket.io notifications
    studentIds.forEach((studentId) => {
      io.to(`user_${studentId}`).emit("new_notification", {
        title,
        message,
        type: "upcoming_test",
        days_remaining: daysRemaining,
        created_at: new Date(),
      });
    });

    console.log(
      `Notified ${studentIds.length} students about upcoming test: ${testName} (${daysRemaining} days)`
    );
  } catch (error) {
    console.error("Error notifying students about upcoming test:", error);
  }
};
