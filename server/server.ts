import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import AuthRoutes from "./routes/AuthRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT: number = Number(process.env.PORT) || 5000;

app.use("/api/auth", AuthRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});