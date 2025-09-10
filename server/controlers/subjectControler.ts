import { Request, Response } from "express";
import { sql } from "../db/inidex";


export const createSubject = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { classId, subjectName, subjectTeacherId } = req.body;

    if (!classId || !subjectName) {
      return res.status(400).json({ error: "classId and subjectName are required" });
    }

    const result = await sql`
      INSERT INTO subject (class_id, subject_name, subject_teacher_id)
      VALUES (${classId}, ${subjectName}, ${subjectTeacherId})
      RETURNING *;
    `;

    return res.status(201).json({
      message: "Subject created successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Get All Subjects
// =========================
export const getAllSubjects = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const subjects = await sql`
      SELECT * FROM subject ORDER BY subject_id;
    `;

    return res.status(200).json({ data: subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Get Subjects by ClassId
// =========================
export const getSubjectsByClass = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { classId } = req.params;

    const subjects = await sql`
      SELECT * FROM subject WHERE class_id = ${classId} ORDER BY subject_id;
    `;

    if (subjects.length === 0) {
      return res.status(404).json({ error: "No subjects found for this class" });
    }

    return res.status(200).json({ data: subjects });
  } catch (error) {
    console.error("Error fetching subjects by class:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Update Subject
// =========================
export const updateSubject = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { subjectName, subjectTeacherId } = req.body;

    const result = await sql`
      UPDATE subject 
      SET subject_name = COALESCE(${subjectName}, subject_name),
          subject_teacher_id = COALESCE(${subjectTeacherId}, subject_teacher_id),
          updated_at = NOW()
      WHERE subject_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    return res.status(200).json({
      message: "Subject updated successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Delete Subject
// =========================
export const deleteSubject = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const result = await sql`
      DELETE FROM subject WHERE subject_id = ${id} RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    return res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
