import { Request, Response } from "express";
import { sql } from "../db/inidex";

// =========================
export const createStudentProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { studentId, rollNumber, classId, sectionId, dob, guardianName, guardianMobileNumber, studentMobileNumber } = req.body;

    if (!studentId || !rollNumber || !classId || !sectionId) {
      return res.status(400).json({ error: "studentId, rollNumber, classId, and sectionId are required" });
    }

    const result = await sql`
      INSERT INTO student_profile 
        (student_id, roll_number, class_id, section_id, dob, guardian_name, guardian_mobile_number, student_mobile_number)
      VALUES 
        (${studentId}, ${rollNumber}, ${classId}, ${sectionId}, ${dob}, ${guardianName}, ${guardianMobileNumber}, ${studentMobileNumber})
      RETURNING *;
    `;

    return res.status(201).json({
      message: "Student profile created successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating student profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Get All Student Profiles
// =========================
export const getAllStudentProfiles = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const students = await sql`
      SELECT * FROM student_profile ORDER BY student_id;
    `;

    return res.status(200).json({ data: students });
  } catch (error) {
    console.error("Error fetching student profiles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Get Student Profile by ID
// =========================
export const getStudentProfileById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const result = await sql`
      SELECT * FROM student_profile WHERE student_id = ${id};
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    return res.status(200).json({ data: result[0] });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Update Student Profile
// =========================
export const updateStudentProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { rollNumber, classId, sectionId, dob, guardianName, guardianMobileNumber, studentMobileNumber } = req.body;

    const result = await sql`
      UPDATE student_profile
      SET roll_number = COALESCE(${rollNumber}, roll_number),
          class_id = COALESCE(${classId}, class_id),
          section_id = COALESCE(${sectionId}, section_id),
          dob = COALESCE(${dob}, dob),
          guardian_name = COALESCE(${guardianName}, guardian_name),
          guardian_mobile_number = COALESCE(${guardianMobileNumber}, guardian_mobile_number),
          student_mobile_number = COALESCE(${studentMobileNumber}, student_mobile_number),
          updated_at = NOW()
      WHERE student_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    return res.status(200).json({
      message: "Student profile updated successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating student profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Delete Student Profile
// =========================
export const deleteStudentProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const result = await sql`
      DELETE FROM student_profile WHERE student_id = ${id} RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    return res.status(200).json({ message: "Student profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting student profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
