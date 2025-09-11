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
              'section_updated_at', s.updated_at
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


