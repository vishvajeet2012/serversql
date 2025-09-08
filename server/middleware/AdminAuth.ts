import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../middleware/auth"; 

const JWT_SECRET: string = process.env.JWT_SECRET || "your_jwt_secret";

export const authenticateAdmin = (req: Request,  res: Response,next: NextFunction
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
    
    const decodedToken = decoded as DecodedToken;
    
    if (decodedToken.role !== "Admin") {
      res.status(403).json({ error: "Access denied. Admin role required" });
      return;
    }
    
    (req as any).user = decodedToken;
    next();
  });
};
