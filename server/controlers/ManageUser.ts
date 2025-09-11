import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import { sql } from "../db/inidex";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";



interface User {
  user_id: number;  
  name?: string;
  email?: string;
  mobile_number?: string;
  profile_picture?: string;
  password_hash?: string;  /// ? question mark use jb htoa hai jb  filed ka hona or na hona matter nahi  kr ta hai 
  role?: 'Admin' | 'Teacher' | 'Student';
  status?: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
}

export const manageStudents =async (req:Request,res:Response): Promise<Response> => {
   
    try{
        console.log(req.body)
            const { status  ,user_id , mobile_number,role, name, email } =  req.body as any

            const parsedUserId = Number(user_id?.toString().trim())

           if (!parsedUserId) {
      return res.status(400).json({
        message: "user id required plase try again",
        status: false
      });}
      
      if (role === 'Admin') {
  res.status(403).json({
    message: "You cannot change role to admin — permission not allowed."
  });
}
      

    const checkUser=  await sql`
     SELECT user_id, name, email, mobile_number, profile_picture,
            role, status, created_at, updated_at
     FROM users
     WHERE user_id = ${parsedUserId}
    ` as User[];



    if(checkUser.length ===0 ){
        return res.status(404).json({
            message:"user not found ",
            status: false
        }) }

      const updateFields: Partial<User> = {};



    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (mobile_number !== undefined) updateFields.mobile_number = mobile_number;
    if (role !== undefined) updateFields.role = role;
    if (status !== undefined) updateFields.status = status;


    const now = new Date();


    const updateUser= await sql`
    UPDATE users 
    SET
        name = CASE WHEN ${name !== undefined} THEN ${name} ELSE name END,
        email = CASE WHEN ${email !== undefined} THEN ${email} ELSE email END,
        mobile_number = CASE WHEN ${mobile_number !== undefined} THEN ${mobile_number} ELSE mobile_number END,
        role = CASE WHEN ${role !== undefined} THEN ${role} ELSE role END,
        status = CASE WHEN ${status !== undefined} THEN ${status} ELSE status END,
        updated_at = ${now}
      WHERE user_id = ${parsedUserId}
      RETURNING user_id, name, email, mobile_number, profile_picture,
                role, status, created_at, updated_at
    ` as User[];
    if(updateUser){
    return res.status(200).json({message:"update successfully ",status:true, data:updateUser[0]})
    }else{
            return res.status(400).json({message:"error while updateding data  ",status:false,})



    }
                    }catch(error){
                        return res.status(500).json({message:"internal  server error"  ,status:false, 
                            error:error
                        })
                    }




}



export const getAllUserData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ 
        message: "Role is required", 
        status: false 
      });
    }

    const validRoles = ['Admin', 'Teacher', 'Student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Invalid role. Role must be Admin, Teacher, or Student", 
        status: false
      });
    }  

    const users = await sql`
      SELECT user_id, name, email, mobile_number, profile_picture,
             role, status, created_at, updated_at
      FROM users
      WHERE role = ${role}
      ORDER BY created_at DESC
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ 
        message: `No ${role}s found`, 
        status: false 
      });
    }

    const usersWithProfiles = await Promise.all(
      users.map(async (user: any) => {
        let profileData: any = null;

        if (user.role === "Student") {
          const studentProfile = await sql`
            SELECT sp.student_id, sp.roll_number, sp.class_id, sp.section_id, sp.dob,
                   sp.guardian_name, sp.guardian_mobile_number, sp.student_mobile_number,
                   sp.created_at, sp.updated_at,
                   c.class_name,
                   s.section_name
            FROM student_profile sp
            JOIN class c ON sp.class_id = c.class_id
            JOIN section s ON sp.section_id = s.section_id
            WHERE sp.student_id = ${user.user_id}
          `;
          profileData = studentProfile[0] || null;
        }

        if (user.role === "Teacher") {
          const teacherProfile = await sql`
            SELECT tp.teacher_id, tp.assigned_subjects, tp.class_assignments,
                   tp.created_at, tp.updated_at
            FROM teacher_profile tp
            WHERE tp.teacher_id = ${user.user_id}
          `;
          profileData = teacherProfile[0] || null;
        }

        if (user.role === "Admin") {
          profileData = null;
        }

        return {
          ...user,
          profile: profileData
        };
      })
    );

    return res.status(200).json({
      message: `${role} users data successfully fetched`,
      status: true,
      users: usersWithProfiles,
      count: usersWithProfiles.length
    });

  } catch (error) {
    console.log(error, "get all user api not working");
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
};

export const addUserByAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      email,
      name,
      role,
      mobileNumber,
      profilePicture,
      guardianName,
      guardianMobileNumber,
      studentMobileNumber,
      dob,
      classId,
      sectionId,
      rollNumber
    } = req.body as {
      email: string;
      name: string;
      role: 'Admin' | 'Teacher' | 'Student';
      mobileNumber?: string;
      profilePicture?: string;
      guardianName?: string;
      guardianMobileNumber?: string;
      studentMobileNumber?: string;
      dob?: string;
      classId?: string;
      sectionId?: string;
      rollNumber?: number;
    };

 
    if (!email || !name || !role) {
      return res.status(400).json({ 
        error: "Email, name, and role are required fields" 
      });
    }

    if (!['Admin', 'Teacher', 'Student'].includes(role)) {
      return res.status(400).json({ 
        error: "Role must be Admin, Teacher, or Student" 
      });
    }

    const existingUser = await sql`
      SELECT email FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({ 
        error: "User with this email already exists" 
      });
    }

    const defaultPassword = "1234567890";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const userResult = await sql`
      INSERT INTO users (
        name, 
        email, 
        mobile_number, 
        profile_picture, 
        password_hash, 
        role, 
        status, 
        created_at, 
        updated_at
      ) 
      VALUES (
        ${name}, 
        ${email}, 
        ${mobileNumber || null}, 
        ${profilePicture || null}, 
        ${passwordHash}, 
        ${role}, 
        'Active', 
        NOW(), 
        NOW()
      ) 
      RETURNING user_id, name, email, mobile_number, profile_picture, role, status, created_at, updated_at
    `;

    // Check if user was created successfully
    if (!userResult || userResult.length === 0) {
      return res.status(500).json({ 
        error: "Failed to create user in database" 
      });
    }

    const newUser = userResult[0];
    
    // Additional null check for TypeScript
    if (!newUser) {
      return res.status(500).json({ 
        error: "User creation returned empty result" 
      });
    }

    let profileData: any = null;

    // Create role-specific profile
    if (role === 'Student' && newUser.user_id) {
      // Validate class and section if provided
      if (classId) {
        const classExists = await sql`
          SELECT class_id FROM class WHERE class_id = ${classId}
        `;
        if (classExists.length === 0) {
          return res.status(400).json({ 
            error: "Invalid class ID provided" 
          });
        }
      }

      if (sectionId) {
        const sectionExists = await sql`
          SELECT section_id FROM section WHERE section_id = ${sectionId}
        `;
        if (sectionExists.length === 0) {
          return res.status(400).json({ 
            error: "Invalid section ID provided" 
          });
        }
      }

      const studentProfileResult = await sql`
        INSERT INTO student_profile (
          student_id,
          roll_number,
          class_id,
          section_id,
          dob,
          guardian_name,
          guardian_mobile_number,
          student_mobile_number,
          created_at,
          updated_at
        )
        VALUES (
          ${newUser.user_id},
          ${rollNumber || null},
          ${classId || null},
          ${sectionId || null},
          ${dob || null},
          ${guardianName || null},
          ${guardianMobileNumber || null},
          ${studentMobileNumber || null},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      profileData = studentProfileResult && studentProfileResult.length > 0 ? studentProfileResult[0] : null;
      
      // Get class and section names if available
      if (classId && sectionId && profileData) {
        const classSection = await sql`
          SELECT c.class_name, s.section_name
          FROM class c, section s
          WHERE c.class_id = ${classId} AND s.section_id = ${sectionId}
        `;
        if (classSection && classSection.length > 0) {
          profileData.class_name = classSection[0]?.class_name;
          profileData.section_name = classSection[0]?.section_name;
        }
      }
    }

    if (role === 'Teacher' && newUser.user_id) {
      const teacherProfileResult = await sql`
        INSERT INTO teacher_profile (
          teacher_id,
          assigned_subjects,
          class_assignments,
          created_at,
          updated_at
        )
        VALUES (
          ${newUser.user_id},
          '[]'::jsonb,
          '[]'::jsonb,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      profileData = teacherProfileResult && teacherProfileResult.length > 0 ? teacherProfileResult[0] : null;
    }

    return res.status(201).json({
      message: "User created successfully by admin",
      defaultPassword: defaultPassword,
      user: {
        id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        mobileNumber: newUser.mobile_number,
        profilePicture: newUser.profile_picture,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      },
      profile: profileData
    });

  } catch (error) {
    console.error("Add user by admin error:", error);
    return res.status(500).json({ 
      error: "Failed to create user" 
    });
  }
};
