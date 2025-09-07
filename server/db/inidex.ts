import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

export const sql = neon(process.env.DATABASE_URL);
