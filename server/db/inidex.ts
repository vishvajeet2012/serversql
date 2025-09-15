import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const DATABASE_URLs="postgresql://neondb_owner:npg_DN7nsBzYtw8f@ep-super-recipe-a1bbdbgu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

if (!DATABASE_URLs) {
  throw new Error("DATABASE_URL is missing in .env");
}

export const sql = neon(DATABASE_URLs);
