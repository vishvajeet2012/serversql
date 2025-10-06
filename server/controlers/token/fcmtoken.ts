import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { RequestWithUser } from "../../middleware/auth";

export const updatePushToken = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const { push_token } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found",
      });
      return;
    }

    if (!push_token) {
      res.status(400).json({
        success: false,
        message: "push_token is required",
      });
      return;
    }

    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        push_token,
        updated_at: new Date(),
      },
      select: {
        user_id: true,
        email: true,
        push_token: true,
      },
    });

    console.log(`✅ Push token updated for user ${userId}`);

    res.json({
      success: true,
      message: "Push token updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Update push token error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removePushToken = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        push_token: null,
        updated_at: new Date(),
      },
    });

    console.log(`✅ Push token removed for user ${userId}`);

    res.json({
      success: true,
      message: "Push token removed successfully",
    });
  } catch (error: any) {
    console.error("Remove push token error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
