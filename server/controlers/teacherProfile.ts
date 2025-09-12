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


export const getAllTeacherProfiles = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const teachers = await sql`
      SELECT 
        tp.teacher_id,
        u.name,
        u.mobile_number,
        u.email
      FROM teacher_profile tp
      INNER JOIN users u ON tp.teacher_id = u.user_id
      ORDER BY tp.teacher_id;
    `;
    
    return res.status(200).json({ data: teachers });
  } catch (error) {
    console.error("Error fetching teacher profiles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

      export const searchTeachersByName = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name } = req.body;
        
    if (!name || typeof name !== 'string') {
    
      return res.status(400).json({ 
        error: "Name parameter is required and must be a string" 
      });
    }

    const searchName = name.trim();
    
    if (searchName.length === 0) {
      return res.status(400).json({ 
        error: "Name parameter cannot be empty" 
      });
    }

    const teachers = await sql`
      SELECT 
        tp.teacher_id,
        u.name,
        u.mobile_number,
        u.email
      FROM teacher_profile tp
      INNER JOIN users u ON tp.teacher_id = u.user_id
      WHERE LOWER(u.name) LIKE LOWER(${'%' + searchName + '%'})
      ORDER BY u.name;
    `;
    
    return res.status(200).json({ 
      data: teachers,
      // count: teachers.length,
      // searchTerm: searchName
    });
  } catch (error) {
    console.error("Error searching teacher profiles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



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

export const assignTeacherToSubject = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { teacher_id, subject_id } = req.body;

    if (!teacher_id || !subject_id) {
      return res.status(400).json({ 
        error: "teacher_id and subject_id are required" 
      });
    }

    const subjectResult = await sql`
      SELECT s.*, c.class_name 
      FROM subject s
      JOIN class c ON s.class_id = c.class_id
      WHERE s.subject_id = ${subject_id};
    `;

    if (subjectResult.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subject = subjectResult[0];

    await sql`
      UPDATE subject 
      SET subject_teacher_id = ${teacher_id}, 
          updated_at = NOW()
      WHERE subject_id = ${subject_id};
    `;

    const classAssignment = subject?.class_name;
    
    await sql`
      UPDATE teacher_profile 
      SET assigned_subjects = COALESCE(assigned_subjects, '[]'::jsonb) || ${JSON.stringify([subject?.subject_name])}::jsonb,
          class_assignments = COALESCE(class_assignments, '[]'::jsonb) || ${JSON.stringify([classAssignment])}::jsonb,
          updated_at = NOW()
      WHERE teacher_id = ${teacher_id};
    `;

    return res.status(200).json({
      message: "Teacher assigned to subject successfully",
      data: {
        subject_id: subject_id,
        teacher_id: teacher_id,
        subject_name: subject?.subject_name,
        class_name: subject?.class_name
      }
    });
  } catch (error) {
    console.error("Error assigning teacher to subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};