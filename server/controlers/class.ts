import { Request, Response } from "express";
import { sql } from "../db/inidex";


export const createClass = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { className, description } = req.body;

    if (!className) {
      return res.status(400).json({ error: "className is required" });
    }

    const result = await sql`  INSERT INTO class (class_name, description) VALUES (${className}, ${description}) RETURNING *;`;

    return res.status(201).json({
      message: "Class created successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

