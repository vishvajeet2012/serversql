import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "your_jwt_secret";

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
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    // Make the decoded payload available to controllers
    (req as any).user = decoded as DecodedToken;
    next();
  });
};

