import { Request, Response } from "express";
import { sql } from "../db/inidex";

interface UserRow {
  user_id: number;
  name: string;
  email: string;
  mobile_number?: string;
  profile_picture: string;
  role: "Admin" | "Teacher" | "Student";
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string;
}


export const createClass = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { className, description, section_name, class_teacher_id } = req.body;

    if (!className) {
      return res.status(400).json({ error: "className is required" });
    }

    const classResult = await sql`
      INSERT INTO class (class_name, description) 
      VALUES (${className}, ${description}) 
      RETURNING *;
    `;

    const createdClass = classResult[0];
    let createdSection = null;

    if (section_name) {
      const sectionResult = await sql`
        INSERT INTO section (class_id, section_name, class_teacher_id) 
        VALUES (${createdClass?.class_id}, ${section_name}, ${class_teacher_id || null}) 
        RETURNING *;
      `;
      
      createdSection = sectionResult[0];
    }

    return res.status(201).json({
      message: "Class created successfully",
      data: {
        class: createdClass,
        section: createdSection
      },
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const assignSubjectToClass = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { class_id, subject_name, subject_teacher_id, section_ids } = req.body;

    if (!class_id || !subject_name) {
      return res.status(400).json({ 
        error: "class_id and subject_name are required" 
      });
    }

    const subjectResult = await sql`
      INSERT INTO subject (class_id, subject_name, subject_teacher_id)
      VALUES (${class_id}, ${subject_name}, ${subject_teacher_id || null})
      RETURNING *;
    `;

    const subject = subjectResult;  if (subject_teacher_id) {
      await sql`
        UPDATE teacher_profile 
        SET assigned_subjects = COALESCE(assigned_subjects, '[]'::jsonb) || ${JSON.stringify([subject_name])}::jsonb,
            updated_at = NOW()
        WHERE teacher_id = ${subject_teacher_id};
      `;
    }

    return res.status(201).json({
      message: "Subject assigned to class successfully",
      data: subject,
    });
  } catch (error) {
    console.error("Error assigning subject to class:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// export const getAllClassbysection = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const result = await sql`
//       SELECT 
//         c.class_id,
//         c.class_name,
//         c.description,
//         c.created_at as class_created_at,
//         c.updated_at as class_updated_at,
//         COALESCE(
//           json_agg(
//             json_build_object(
//               'section_id', s.section_id,
//               'section_name', s.section_name,
//               'total_students', COALESCE(student_counts.student_count, 0),
//               'class_teacher_id', s.class_teacher_id,
//               'section_created_at', s.created_at,
//               'section_updated_at', s.updated_at
//             )
//           ) FILTER (WHERE s.section_id IS NOT NULL), '[]'::json
//         ) as sections,
//         json_build_object(
//           'teacher_id', tp.teacher_id,
//           'name', u.name,
//           'email', u.email,
//           'assigned_subjects', tp.assigned_subjects,
//           'class_assignments', tp.class_assignments,
//           'created_at', tp.created_at,
//           'updated_at', tp.updated_at
//         ) as class_teacher
//       FROM class c
//       LEFT JOIN section s ON c.class_id = s.class_id
//       LEFT JOIN (
//         SELECT 
//           section_id, 
//           COUNT(student_id) as student_count 
//         FROM student_profile 
//         GROUP BY section_id
//       ) student_counts ON s.section_id = student_counts.section_id
//       LEFT JOIN teacher_profile tp ON s.class_teacher_id = tp.teacher_id
//       LEFT JOIN users u ON tp.teacher_id = u.user_id
//       GROUP BY 
//         c.class_id, c.class_name, c.description, c.created_at, c.updated_at,
//         tp.teacher_id, u.name, u.email, tp.assigned_subjects, tp.class_assignments, 
//         tp.created_at, tp.updated_at
//       ORDER BY c.class_name;
//     `;

//     return res.status(200).json({
//       message: "Classes retrieved successfully",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error retrieving classes:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };
export const searchClassBySectionWithQuery = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { search } = req.body
    
    let whereClause = '';
    let params: any[] = [];
    
    if (search) {
      whereClause = 'WHERE c.class_name ILIKE $1 OR s.section_name ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await sql`
      SELECT 
        c.class_id,
        c.class_name,
        COALESCE(
          json_agg(
            json_build_object(
              'section_id', s.section_id,
              'section_name', s.section_name
            ) ORDER BY s.section_name
          ) FILTER (WHERE s.section_id IS NOT NULL), 
          '[]'::json
        ) AS sections
      FROM class c
      LEFT JOIN section s ON c.class_id = s.class_id
      ${search ? sql`WHERE c.class_name ILIKE ${`%${search}%`} OR s.section_name ILIKE ${`%${search}%`}` : sql``}
      GROUP BY c.class_id, c.class_name
      ORDER BY c.class_name;
    `;

    return res.status(200).json({
      message: "Classes with sections retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error searching classes with sections:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllClassbysection = async (req: Request, res: Response): Promise<Response> => {
  try {
    const result = await sql`
      SELECT 
        c.class_id,
        c.class_name,
        c.description,
        c.created_at as class_created_at,
        c.updated_at as class_updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'section_id', s.section_id,
              'section_name', s.section_name,
              'total_students', COALESCE(student_counts.student_count, 0),
              'class_teacher_id', s.class_teacher_id,
              'section_created_at', s.created_at,
              'section_updated_at', s.updated_at,
              'section_teachers', COALESCE(st_teachers.section_teachers, '[]'::json)
            )
          ) FILTER (WHERE s.section_id IS NOT NULL), '[]'::json
        ) as sections,
        json_build_object(
          'teacher_id', tp.teacher_id,
          'name', u.name,
          'email', u.email,
          'assigned_subjects', tp.assigned_subjects,
          'class_assignments', tp.class_assignments,
          'created_at', tp.created_at,
          'updated_at', tp.updated_at
        ) as class_teacher
      FROM class c
      LEFT JOIN section s ON c.class_id = s.class_id
      LEFT JOIN (
        SELECT 
          section_id, 
          COUNT(student_id) as student_count 
        FROM student_profile 
        GROUP BY section_id
      ) student_counts ON s.section_id = student_counts.section_id
      LEFT JOIN teacher_profile tp ON s.class_teacher_id = tp.teacher_id
      LEFT JOIN users u ON tp.teacher_id = u.user_id
      -- NEW: aggregate section_teachers
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'teacher_id', st.teacher_id,
            'name', ut.name,
            'email', ut.email
          )
        ) AS section_teachers
        FROM section_teachers st
        JOIN users ut ON st.teacher_id = ut.user_id
        WHERE st.section_id = s.section_id
      ) st_teachers ON TRUE
      GROUP BY 
        c.class_id, c.class_name, c.description, c.created_at, c.updated_at,
        tp.teacher_id, u.name, u.email, tp.assigned_subjects, tp.class_assignments, 
        tp.created_at, tp.updated_at
      ORDER BY c.class_name;
    `;

    return res.status(200).json({
      message: "Classes retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error retrieving classes:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};









export const assignTeacherToClassSection = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { teacher_id, class_id, section_id, isClassTeacher } = req.body;

    if (!teacher_id || !class_id || !section_id) {
      return res.status(400).json({
        error: "teacher_id, class_id, and section_id are required",
      });
    }

    // check user
    const userData = (await sql`
      SELECT user_id, name, email, mobile_number, profile_picture,
             role, status, created_at, updated_at
      FROM users
      WHERE user_id = ${teacher_id}
    `) as UserRow[];

    if (userData.length === 0) {
      return res.status(404).json({
        message: "User not registered",
      });
    }

    const teacherExists = await sql`
      SELECT teacher_id FROM teacher_profile WHERE teacher_id = ${teacher_id}
    `;
    if (teacherExists.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // check class
    const classExists = await sql`
      SELECT class_id, class_name FROM class WHERE class_id = ${class_id}
    `;
    if (classExists.length === 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    // check section
    const sectionExists = await sql`
      SELECT section_id, section_name, class_id 
      FROM section 
      WHERE section_id = ${section_id} AND class_id = ${class_id}
    `;
    if (sectionExists.length === 0) {
      return res.status(404).json({
        error: "Section not found or doesn't belong to the specified class",
      });
    }

    // 👉 Assign teacher
    if (isClassTeacher) {
      // main class teacher assign/update
      await sql`
        UPDATE section 
        SET class_teacher_id = ${teacher_id}, updated_at = NOW()
        WHERE section_id = ${section_id}
      `;
    } else {
      // extra teacher add in mapping table
      await sql`
        INSERT INTO section_teachers (section_id, teacher_id)
        VALUES (${section_id}, ${teacher_id})
        ON CONFLICT (section_id, teacher_id) DO NOTHING
      `;
    }

    // always update teacher_profile assignments
    await sql`
      UPDATE teacher_profile 
      SET class_assignments = COALESCE(class_assignments, '[]'::jsonb) || ${JSON.stringify([
        class_id,
      ])}::jsonb,
          updated_at = NOW()
      WHERE teacher_id = ${teacher_id}
      AND NOT (class_assignments @> ${JSON.stringify([class_id])}::jsonb)
    `;

    // ✅ get updated section details
    const sectionDetails = await sql`
      SELECT 
        s.section_id,
        s.section_name,
        s.class_id,
        c.class_name,
        s.class_teacher_id,
        u.name as class_teacher_name,
        u.email as class_teacher_email,
        u.mobile_number as class_teacher_mobile,
        u.profile_picture as class_teacher_pic,
        s.updated_at
      FROM section s
      JOIN class c ON s.class_id = c.class_id
      LEFT JOIN users u ON s.class_teacher_id = u.user_id
      WHERE s.section_id = ${section_id}
    `;

    // ✅ get extra section teachers
    const extraTeachers = await sql`
      SELECT 
        st.teacher_id,
        u.name as teacher_name,
        u.email as teacher_email,
        u.mobile_number,
        u.profile_picture
      FROM section_teachers st
      JOIN users u ON st.teacher_id = u.user_id
      WHERE st.section_id = ${section_id}
    `;

    return res.status(200).json({
      message: "Teacher assigned successfully",
      data: {
        class: {
          id: sectionDetails[0]?.class_id,
          name: sectionDetails[0]?.class_name,
        },
        section: {
          id: sectionDetails[0]?.section_id,
          name: sectionDetails[0]?.section_name,
          updated_at: sectionDetails[0]?.updated_at,
          class_teacher: sectionDetails[0]?.class_teacher_id
            ? {
                id: sectionDetails[0]?.class_teacher_id,
                name: sectionDetails[0]?.class_teacher_name,
                email: sectionDetails[0]?.class_teacher_email,
                mobile: sectionDetails[0]?.class_teacher_mobile,
                profile_picture: sectionDetails[0]?.class_teacher_pic,
              }
            : null,
          section_teachers: extraTeachers.map((t) => ({
            id: t.teacher_id,
            name: t.teacher_name,
            email: t.teacher_email,
            mobile: t.mobile_number,
            profile_picture: t.profile_picture,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Error assigning teacher to class section:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
