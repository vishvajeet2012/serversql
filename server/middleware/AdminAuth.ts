import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "your-super-secret-jwt-key-at-least-32-characters-long";

export interface DecodedToken {
  userId: number;
  email: string;
  role: "Admin" | "Teacher" | "Student";
  iat: number;
  exp: number;
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;

    
  } jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const decodedToken = decoded as DecodedToken; if (decodedToken.role !== "Admin") {
      res.status(403).json({ error: "Access denied. Admin role required" });
      return;
    } (req as any).user = decodedToken;
    next();
  });
};
