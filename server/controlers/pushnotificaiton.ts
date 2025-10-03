// controllers/pushTokenController.ts - NEW FILE
import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";

export const savePushToken = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { pushToken } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!pushToken || typeof pushToken !== 'string') {
      res.status(400).json({ error: "Valid push token is required" });
      return;
    }

    // Validate Expo push token format
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      res.status(400).json({ error: "Invalid Expo push token format" });
      return;
    }

    // Update user's push token
    await prisma.users.update({
      where: { user_id: userId },
      data: { 
        push_token: pushToken,
        updated_at: new Date()
      },
    });

    console.log(`✅ Push token saved for user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Push token saved successfully",
    });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removePushToken = async (
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

    // Remove user's push token
    await prisma.users.update({
      where: { user_id: userId },
      data: { 
        push_token: null,
        updated_at: new Date()
      },
    });

    console.log(`✅ Push token removed for user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Push token removed successfully",
    });
  } catch (error) {
    console.error("Error removing push token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
