import admin from "../config/firebase-admin";

interface SingleNotificationData {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
}

interface MultipleNotificationData {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
}

interface SilentDataMessage {
  token: string;
  data: Record<string, string>;
}

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
  imageUrl,
  badge,
}: SingleNotificationData) => {
  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: badge || 1,
            contentAvailable: true,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent successfully:", response);

    return {
      success: true,
      messageId: response,
    };
  } catch (error: any) {
    console.error("❌ Failed to send notification:", error);

    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.log("⚠️  Invalid/unregistered token:", token);
    }

    return {
      success: false,
      error: error.message,
      errorCode: error.code,
    };
  }
};

export const sendBulkNotifications = async ({
  tokens,
  title,
  body,
  data = {},
  imageUrl,
  badge,
}: MultipleNotificationData) => {
  try {
    const validTokens = tokens.filter((token) => token && token.trim() !== "");

    if (validTokens.length === 0) {
      return {
        success: false,
        error: "No valid tokens provided",
      };
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      tokens: validTokens,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: badge || 1,
            contentAvailable: true,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Successfully sent: ${response.successCount}/${validTokens.length}`);

    if (response.failureCount > 0) {
      console.log(`❌ Failed: ${response.failureCount}`);
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTokens: validTokens.length,
    };
  } catch (error: any) {
    console.error("❌ Bulk notification failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const sendSilentDataMessage = async ({
  token,
  data,
}: SilentDataMessage) => {
  try {
    const message: admin.messaging.Message = {
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        silent: "true",
      },
      token,
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
        headers: {
          "apns-push-type": "background",
          "apns-priority": "5",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Silent data message sent:", response);

    return {
      success: true,
      messageId: response,
    };
  } catch (error: any) {
    console.error("❌ Silent message failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const sendBulkSilentDataMessages = async (
  tokens: string[],
  data: Record<string, string>
) => {
  try {
    const validTokens = tokens.filter((token) => token && token.trim() !== "");

    if (validTokens.length === 0) {
      return { success: false, error: "No valid tokens" };
    }

    const message: admin.messaging.MulticastMessage = {
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        silent: "true",
      },
      tokens: validTokens,
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Silent messages sent: ${response.successCount}/${validTokens.length}`);

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error("❌ Bulk silent messages failed:", error);
    return { success: false, error: error.message };
  }
};
