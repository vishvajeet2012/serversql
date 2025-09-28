// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Use the existing JWT secret from your .env file
const JWT_SECRET: string = process.env.JWT_SECRET || "your-super-secret-jwt-key-at-least-32-characters-long";

export interface DecodedToken {
  userId: number;
  email: string;
  role: "Admin" | "Teacher" | "Student";
}

export interface RequestWithUser extends Request {
  user?: DecodedToken;
}

// Your existing authentication middleware
export const authenticateJWT = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    // Attach the decoded payload to the request object
    req.user = decoded as DecodedToken;
    next();
  });
};

// ⭐ NEW: Authorization middleware to check for the 'Teacher' role
export const authorizeTeacher = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  // This middleware should run AFTER authenticateJWT
  if (req.user?.role !== "Teacher") {
    res.status(403).json({ error: "Forbidden: Access is restricted to teachers only." });
    return;
  }
  next();
};