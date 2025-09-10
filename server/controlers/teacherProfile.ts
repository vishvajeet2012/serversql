import { Request, Response } from "express";
import { sql } from "../db/inidex";

// =========================
// Create Teacher Profile
// =========================
export const createTeacherProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { teacherId, assignedSubjects, classAssignments } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required" });
    }

    const result = await sql`
      INSERT INTO teacher_profile 
        (teacher_id, assigned_subjects, class_assignments)
      VALUES 
        (${teacherId}, ${JSON.stringify(assignedSubjects || [])}::jsonb, ${JSON.stringify(classAssignments || [])}::jsonb)
      RETURNING *;
    `;

    return res.status(201).json({
      message: "Teacher profile created successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating teacher profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Get All Teacher Profiles
// =========================
export const getAllTeacherProfiles = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const teachers = await sql`
      SELECT * FROM teacher_profile ORDER BY teacher_id;
    `;

    return res.status(200).json({ data: teachers });
  } catch (error) {
    console.error("Error fetching teacher profiles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Get Teacher Profile by ID
// =========================
export const getTeacherProfileById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const result = await sql`
      SELECT * FROM teacher_profile WHERE teacher_id = ${id};
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    return res.status(200).json({ data: result[0] });
  } catch (error) {
    console.error("Error fetching teacher profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Update Teacher Profile
// =========================
export const updateTeacherProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { assignedSubjects, classAssignments } = req.body;

    const result = await sql`
      UPDATE teacher_profile
      SET assigned_subjects = COALESCE(${assignedSubjects ? JSON.stringify(assignedSubjects) : null}::jsonb, assigned_subjects),
          class_assignments = COALESCE(${classAssignments ? JSON.stringify(classAssignments) : null}::jsonb, class_assignments),
          updated_at = NOW()
      WHERE teacher_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    return res.status(200).json({
      message: "Teacher profile updated successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating teacher profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Delete Teacher Profile
// =========================
export const deleteTeacherProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const result = await sql`
      DELETE FROM teacher_profile WHERE teacher_id = ${id} RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    return res.status(200).json({ message: "Teacher profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
