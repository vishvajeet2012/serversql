import { Response, NextFunction } from "express";
import { RequestWithUser } from "./auth";

// ⭐ NEW: Authorization middleware to check for the 'Teacher' role
export const authorizeTeacher = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  // This middleware should run AFTER authenticateJWT
  if (req.user?.role !== "Teacher") {
    res
      .status(403)
      .json({ error: "Forbidden: Access is restricted to teachers only." });
    return;
  }
  next();
};