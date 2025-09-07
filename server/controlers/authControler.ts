import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { sql } from "../db/inidex";
import bcrypt from "bcryptjs";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";

const JWT_SECRET: string = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";

interface User {
  user_id: number;
  name: string;
  email: string;
  mobile_number?: string;
  profile_picture: string;
  password_hash?: string;
  role: 'Admin' | 'Teacher' | 'Student';
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}
interface UserRow {
  user_id: number;
  name: string;
  email: string;
  mobile_number?: string;
  profile_picture: string;
  role: "Admin" | "Teacher" | "Student";
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string;
}

// Register User
export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, password, mobileNumber } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      mobileNumber?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await sql`
      INSERT INTO users (name, email, mobile_number, password_hash)
      VALUES (${name}, ${email}, ${mobileNumber || null}, ${passwordHash})
      RETURNING user_id, name, email, mobile_number, profile_picture, role, status, created_at, updated_at
    `;
    const users = result as User[];
    const newUser = users[0];

    if (!newUser?.user_id) {
      return res.status(500).json({ error: "User ID not found after registration" });
    }

    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        mobileNumber: newUser.mobile_number,
        profilePicture: newUser.profile_picture,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      }
    });

  } catch (error: any) {
    if (error.message.includes("duplicate key") || error.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};

// Login User
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string; };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await sql`
      SELECT user_id, name, email, mobile_number, profile_picture, password_hash, role, status, created_at, updated_at
      FROM users 
      WHERE email = ${email} AND status = 'Active'
    `;

    const users = result as User[];
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash!);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobile_number,
        profilePicture: user.profile_picture,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};





export const getMe = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = (req as any).user as DecodedToken;

  const rows = await sql`
    SELECT user_id, name, email, mobile_number, profile_picture,
           role, status, created_at, updated_at
    FROM users
    WHERE user_id = ${userId}
  ` as UserRow[];  

  const me = rows[0];
  if (!me) return res.status(404).json({ error: "User not found" });

  return res.json({ user: me });
};
