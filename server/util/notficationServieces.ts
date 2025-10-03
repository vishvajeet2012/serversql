// utils/notificationService.ts - COMPLETE FILE
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

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Get push tokens for multiple users
const getPushTokensForUsers = async (userIds: number[]): Promise<string[]> => {
  try {
    const users = await prisma.users.findMany({
      where: {
        user_id: { in: userIds },
        push_token: { not: null },
      },
      select: {
        push_token: true,
      },
    });

    return users
      .map((user) => user.push_token)
      .filter((token): token is string => token !== null);
  } catch (error) {
    console.error("Error fetching push tokens:", error);
    return [];
  }
};

// Create single notification in database
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
      skipDuplicates: true,
    });

    return result;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw error;
  }
};

// Send Expo Push Notifications
export const sendExpoPushNotification = async (
  expoPushTokens: string[],
  title: string,
  message: string,
  data?: any
) => {
  try {
    const messages: ExpoPushMessage[] = [];

    for (const pushToken of expoPushTokens) {
      // Validate Expo push token
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Invalid Expo push token: ${pushToken}`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: "default",
        title: title,
        body: message,
        data: data || {},
        priority: "high",
        channelId: "default",
      });
    }

    if (messages.length === 0) {
      console.log("No valid push tokens to send notifications");
      return [];
    }

    // Chunk notifications (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`✅ Sent ${chunk.length} push notifications`);
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Error in sendExpoPushNotification:", error);
    return [];
  }
};

// ==========================================
// NOTIFICATION FUNCTIONS
// ==========================================

// 1️⃣ NEW TEST CREATED
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
    // Get all students in class/section
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

    if (studentIds.length === 0) {
      console.log("No students found for notification");
      return;
    }

    const title = "📝 New Test Scheduled";
    const message = `${testName} (${subject}) has been scheduled for ${new Date(
      dateConducted
    ).toLocaleDateString()}. Max Marks: ${maxMarks}`;

    // 1. Save to Database
    await createBulkNotifications({
      user_ids: studentIds,
      title,
      message,
    });

    // 2. Send via Socket.io (Real-time)
    studentIds.forEach((studentId) => {
      io.to(`user_${studentId}`).emit("new_notification", {
        title,
        message,
        type: "test_created",
        test_name: testName,
        subject: subject,
        date_conducted: dateConducted,
        max_marks: maxMarks,
        created_at: new Date(),
      });
    });

    // 3. Send via Expo Push
    const pushTokens = await getPushTokensForUsers(studentIds);
    if (pushTokens.length > 0) {
      await sendExpoPushNotification(pushTokens, title, message, {
        type: "test_created",
        test_name: testName,
        subject: subject,
      });
    }

    console.log(`📝 Notified ${studentIds.length} students about new test: ${testName}`);
  } catch (error) {
    console.error("Error in notifyStudentsAboutNewTest:", error);
  }
};

// 2️⃣ MARKS APPROVED
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

    // 1. Save to Database
    await createNotification({
      user_id: studentId,
      title,
      message,
    });

    // 2. Send via Socket.io
    io.to(`user_${studentId}`).emit("new_notification", {
      title,
      message,
      type: "marks_approved",
      marks_obtained: marksObtained,
      max_marks: maxMarks,
      percentage,
      created_at: new Date(),
    });

    // 3. Send via Expo Push
    const pushTokens = await getPushTokensForUsers([studentId]);
    if (pushTokens.length > 0) {
      await sendExpoPushNotification(pushTokens, title, message, {
        type: "marks_approved",
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        percentage,
      });
    }

    console.log(`✅ Notified student ${studentId} about marks approval: ${testName}`);
  } catch (error) {
    console.error("Error in notifyStudentAboutMarksApproval:", error);
  }
};

// 3️⃣ NEW FEEDBACK
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

    // 1. Save to Database
    await createNotification({
      user_id: studentId,
      title,
      message,
    });

    // 2. Send via Socket.io
    io.to(`user_${studentId}`).emit("new_notification", {
      title,
      message,
      type: "feedback_received",
      test_name: testName,
      teacher_name: teacherName,
      created_at: new Date(),
    });

    // 3. Send via Expo Push
    const pushTokens = await getPushTokensForUsers([studentId]);
    if (pushTokens.length > 0) {
      await sendExpoPushNotification(pushTokens, title, message, {
        type: "feedback_received",
        test_name: testName,
        teacher_name: teacherName,
      });
    }

    console.log(`💬 Notified student ${studentId} about feedback on: ${testName}`);
  } catch (error) {
    console.error("Error in notifyStudentAboutFeedback:", error);
  }
};

// 4️⃣ UPCOMING TEST REMINDER (Cron Job)
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

    if (studentIds.length === 0) {
      console.log("No students found for upcoming test notification");
      return;
    }

    const title = `⏰ Test Reminder - ${daysRemaining} Day${daysRemaining > 1 ? "s" : ""} Left`;
    const message = `${testName} (${subject}) is scheduled on ${new Date(
      dateConducted
    ).toLocaleDateString()}. Prepare well!`;

    // 1. Save to Database
    await createBulkNotifications({
      user_ids: studentIds,
      title,
      message,
    });

    // 2. Send via Socket.io
    studentIds.forEach((studentId) => {
      io.to(`user_${studentId}`).emit("new_notification", {
        title,
        message,
        type: "upcoming_test",
        days_remaining: daysRemaining,
        test_name: testName,
        subject: subject,
        date_conducted: dateConducted,
        created_at: new Date(),
      });
    });

    // 3. Send via Expo Push
    const pushTokens = await getPushTokensForUsers(studentIds);
    if (pushTokens.length > 0) {
      await sendExpoPushNotification(pushTokens, title, message, {
        type: "upcoming_test",
        days_remaining: daysRemaining,
        test_name: testName,
        subject: subject,
        date_conducted: dateConducted,
      });
    }

    console.log(
      `⏰ Notified ${studentIds.length} students about upcoming test: ${testName} (${daysRemaining} days left)`
    );
  } catch (error) {
    console.error("Error in notifyStudentsAboutUpcomingTest:", error);
  }
};
