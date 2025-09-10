import { Request, Response } from "express";
import { sql } from "../db/inidex";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";




export const addStudentProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, role } = (req as any).user as DecodedToken;
    const {
      studentId, // only required if role = Admin
      rollNumber,
      classId,
      sectionId,
      dob,
      guardianName,
      guardianMobileNumber,
      studentMobileNumber,
    } = req.body;
    const targetStudentId = role === "Admin" ? studentId : userId;
    if (!targetStudentId) {
      return res.status(400).json({ error: "Student ID is required for admin updates" });
    }

    // Allow only Student or Admin roles to add/update profile
    if (role !== "Student" && role !== "Admin") {
      return res.status(403).json({ error: "Only students or admins can add/update a student profile" });
    }

    // Verify target user exists and is a Student
    const userCheck = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${targetStudentId};
    `;
    if (userCheck.length === 0 || userCheck[0]?.role !== "Student") {
      return res.status(404).json({ error: "Target student not found" });
    }

    // Check if student profile exists (using user_id as FK column)
    const existingProfile = await sql`
      SELECT * FROM student_profiles WHERE user_id = ${targetStudentId};
    `;

    if (existingProfile.length > 0) {
      // Update existing profile
      await sql`
        UPDATE student_profiles
        SET roll_number = ${rollNumber},
            class_id = ${classId},
            section_id = ${sectionId},
            dob = ${dob},
            guardian_name = ${guardianName},
            guardian_mobile_number = ${guardianMobileNumber},
            student_mobile_number = ${studentMobileNumber},
            updated_at = NOW()
        WHERE user_id = ${targetStudentId}
      `;
    } else {
      // Insert new profile
      await sql`
        INSERT INTO student_profiles
        (user_id, roll_number, class_id, section_id, dob, guardian_name, guardian_mobile_number, student_mobile_number)
        VALUES
        (${targetStudentId}, ${rollNumber}, ${classId}, ${sectionId}, ${dob}, ${guardianName}, ${guardianMobileNumber}, ${studentMobileNumber})
      `;
    }

    return res.json({ message: "Student profile saved successfully" });
  } catch (error) {
    console.error("Add Student Profile error:", error);
    return res.status(500).json({ error: "Failed to add student profile" });
  }
};