import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import AuthRoutes from "./routes/AuthRoutes";
import UserRoutes from "./routes/UserRoutes";
import TeachRoutes from "./routes/teacherRoutes"

dotenv.config();

const app = express();
app.use(cors())
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      console.log('Invalid JSON received:', buf.toString());
      throw err;
    }
  }
}));

const PORT: number = Number(process.env.PORT) || 5000;

app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes)
app.use("/api/teacher",TeachRoutes)


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
})