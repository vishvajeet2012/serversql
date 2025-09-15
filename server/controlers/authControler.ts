import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { sql } from "../db/inidex";
import bcrypt from "bcryptjs";
import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import prisma from './../db/prisma';



const JWT_SECRET: string = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";


interface User {
  user_id: number;
  name: string;
  email: string;
  mobile_number?: string;
  profile_picture: string;
  password_hash?: string;  /// ? question mark use jb htoa hai jb  filed ka hona or na hona matter nahi  kr ta hai 
  role: 'Admin' | 'Teacher' | 'Student';
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

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

// export const registerUser = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const { name, email, password, mobileNumber } = req.body as {
//       name?: string;
//       email?: string;
//       password?: string;
//       mobileNumber?: string;
//     };

    
//     if (!name || !email || !password) {
//       return res.status(400).json({ error: "Name, email, and password are required" });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ error: "Invalid email format" });
//     }

//     if (password.length < 8) {
//       return res.status(400).json({ error: "Password must be at least 8 characters long" });
//     }

//     const passwordHash = await bcrypt.hash(password, 10);

//     const result = await sql`
//       INSERT INTO users (name, email, mobile_number, password_hash)
//       VALUES (${name}, ${email}, ${mobileNumber || null}, ${passwordHash})
//       RETURNING user_id, name, email, mobile_number, profile_picture, role, status, created_at, updated_at
//     `;
//     const users = result as User[];
//     const newUser = users[0];

//     if (!newUser?.user_id) {
//       return res.status(500).json({ error: "User ID not found after registration" });
//     }

//     const token = jwt.sign(
//       { userId: newUser.user_id, email: newUser.email, role: newUser.role },
//       JWT_SECRET,
//       { expiresIn: JWT_EXPIRES_IN } as SignOptions
//     );

//     return res.status(201).json({
//       message: "User registered successfully",
//       token,
//       user: {
//         id: newUser.user_id,
//         name: newUser.name,
//         email: newUser.email,
//         mobileNumber: newUser.mobile_number,
//         profilePicture: newUser.profile_picture,
//         role: newUser.role,
//         status: newUser.status,
//         createdAt: newUser.created_at,
//         updatedAt: newUser.updated_at
//       }
//     });

//   } catch (error: any) {
//     if (error.message.includes("duplicate key") || error.code === "23505") {
//       return res.status(400).json({ error: "Email already exists" });
//     }
//     console.error("Registration error:", error);
//     return res.status(500).json({ error: "Registration failed" });
//   }
// };



// // export const loginUser = async (req: Request, res: Response): Promise<Response> => {
// //   try {
// //     const { email, password, role } = req.body as { 
// //       email?: string; 
// //       password?: string; 
// //       role?: 'Admin' | 'Teacher' | 'Student'; // Fixed: Added role to type definition
// //     };
// // console.log(role)
// //     if (!email || !password) {
// //       return res.status(400).json({ error: "Email and password are required" });
// //     }


// //     const query =  sql`
// //           SELECT user_id, name, email, mobile_number, profile_picture, password_hash, role, status, created_at, updated_at
// //           FROM users 
// //           WHERE email = ${email} AND role = ${role} AND status = 'Active'
// //         `
     
// //     const result = await query;
// //     const users = result as User[]; 
// //     const user = users[0];
// // console.log(users)
// //     if (!user) {
// //       return res.status(403).json({ error: "Invalid role specified" });
// //     }

// //       let profileData: any = null;

// //     if (user?.role === "Student") {
// //       const studentProfile = await sql`
// //         SELECT sp.student_id, sp.roll_number, sp.class_id, sp.section_id, sp.dob,
// //                sp.guardian_name, sp.guardian_mobile_number, sp.student_mobile_number,
// //                sp.created_at, sp.updated_at,
// //                c.class_name,
// //                s.section_name
// //         FROM student_profile sp
// //         JOIN class c ON sp.class_id = c.class_id
// //         JOIN section s ON sp.section_id = s.section_id
// //         WHERE sp.student_id = ${user?.user_id}
// //       `;
// //       profileData = studentProfile[0] || null;
// //     }

// //     if (user?.role === "Teacher") {
// //       const teacherProfile = await sql`
// //         SELECT tp.teacher_id, tp.assigned_subjects, tp.class_assignments,
// //                tp.created_at, tp.updated_at
// //         FROM teacher_profile tp
// //         WHERE tp.teacher_id = ${user?.user_id}
// //       `;
// //       profileData = teacherProfile[0] || null;
// //     }

// //     const isValidPassword = await bcrypt.compare(password, user.password_hash!);
// //     if (!isValidPassword) {
// //       return res.status(401).json({ error: "Invalid email or password" });
// //     }

// //     const token = jwt.sign(
// //       { userId: user.user_id, email: user.email, role: user.role },
// //       JWT_SECRET,
// //       { expiresIn: JWT_EXPIRES_IN } as SignOptions
// //     );

// //     return res.json({
// //       message: "Login successful",
// //       token,
// //       user: {
// //         id: user.user_id,
// //         name: user.name,
// //         email: user.email,
// //         mobileNumber: user.mobile_number,
// //         profilePicture: user.profile_picture,
// //         role: user.role,
// //         status: user.status,
// //         createdAt: user.created_at,
// //         updatedAt: user.updated_at
// //       }
// //      , profile: profileData, 
// //     });

// //   } catch (error) {
// //     console.error("Login error:", error);
// //     return res.status(500).json({ error: "Login failed" });
// //   }
// // };


// export const loginUser = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const { email, password, role } = req.body as { 
//       email?: string; 
//       password?: string; 
//       role?: 'Admin' | 'Teacher' | 'Student';
//     };

//     console.log(role);

//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     // Find user with specified email, role, and active status
//     const user = await prisma.users.findFirst({
//       where: {
//         email: email,
//         role: role,
//         status: 'Active'
//       },
//       select: {
//         user_id: true,
//         name: true,
//         email: true,
//         mobile_number: true,
//         profile_picture: true,
//         password_hash: true,
//         role: true,
//         status: true,
//         created_at: true,
//         updated_at: true
//       }
//     });

//     console.log(user);

//     if (!user) {
//       return res.status(403).json({ error: "Invalid role specified" });
//     }

//     let profileData: any = null;

//     // Fetch student profile if user is a student
//     if (user.role === "Student") {
//       const studentProfile = await prisma.studentProfile.findUnique({
//         where: {
//           student_id: user.user_id
//         },
//         include: {
//           class: {
//             select: {
//               class_name: true
//             }
//           },
//           section: {
//             select: {
//               section_name: true
//             }
//           }
//         }
//       });

//       if (studentProfile) {
//         profileData = {
//           student_id: studentProfile.student_id,
//           roll_number: studentProfile.roll_number,
//           class_id: studentProfile.class_id,
//           section_id: studentProfile.section_id,
//           dob: studentProfile.dob,
//           guardian_name: studentProfile.guardian_name,
//           guardian_mobile_number: studentProfile.guardian_mobile_number,
//           student_mobile_number: studentProfile.student_mobile_number,
//           created_at: studentProfile.created_at,
//           updated_at: studentProfile.updated_at,
//           class_name: studentProfile.class?.class_name,
//           section_name: studentProfile.section?.section_name
//         };
//       }
//     }

//     // Fetch teacher profile if user is a teacher
//     if (user.role === "Teacher") {
//       const teacherProfile = await prisma.teacher_profile.findUnique({
//         where: {
//           teacher_id: user.user_id
//         },
//         select: {
//           teacher_id: true,
//           assigned_subjects: true,
//           class_assignments: true,
//           created_at: true,
//           updated_at: true
//         }
//       });
//       profileData = teacherProfile || null;
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, user.password_hash!);
//     if (!isValidPassword) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: user.user_id, email: user.email, role: user.role },
//       JWT_SECRET,
//       { expiresIn: JWT_EXPIRES_IN } as SignOptions
//     );

//     return res.json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user.user_id,
//         name: user.name,
//         email: user.email,
//         mobileNumber: user.mobile_number,
//         profilePicture: user.profile_picture,
//         role: user.role,
//         status: user.status,
//         createdAt: user.created_at,
//         updatedAt: user.updated_at
//       },
//       profile: profileData,
//     });

//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ error: "Login failed" });
//   }
// };

// export const getMe = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const { userId } = (req as any).user as DecodedToken;

//    const rows = await sql`
//     SELECT user_id, name, email, mobile_number, profile_picture,
//            role, status, created_at, updated_at
//     FROM users
//     WHERE user_id = ${userId}
//   ` as UserRow[];  

//     const me = rows[0];
//     if (!me) return res.status(404).json({ error: "User not found" });

//     let profileData: any = null;

//     if (me.role === "Student") {
//       const studentProfile = await sql`
//         SELECT sp.student_id, sp.roll_number, sp.class_id, sp.section_id, sp.dob,
//                sp.guardian_name, sp.guardian_mobile_number, sp.student_mobile_number,
//                sp.created_at, sp.updated_at,
//                c.class_name,
//                s.section_name
//         FROM student_profile sp
//         JOIN class c ON sp.class_id = c.class_id
//         JOIN section s ON sp.section_id = s.section_id
//         WHERE sp.student_id = ${userId}
//       `;
//       profileData = studentProfile[0] || null;
//     }

//     if (me.role === "Teacher") {
//       const teacherProfile = await sql`
//         SELECT tp.teacher_id, tp.assigned_subjects, tp.class_assignments,
//                tp.created_at, tp.updated_at
//         FROM teacher_profile tp
//         WHERE tp.teacher_id = ${userId}
//       `;
//       profileData = teacherProfile[0] || null;
//     }

//     return res.json({
//       user: me,
//       profile: profileData,
//     });
//   } catch (error) {
//     console.error("Error in getMe:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };





export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, password, mobileNumber } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      mobileNumber?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        name: name,
        email: email,
        mobile_number: mobileNumber || null,
        password_hash: passwordHash
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!newUser?.user_id) {
      return res.status(500).json({ error: "User ID not found after registration" });
    }

    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.status(201).json({
      message: "User registered successfully",
      token,
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
      }
    });

  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, role } = req.body as { 
      email?: string; 
      password?: string; 
      role?: string;
    };

    console.log(role);

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, and role are required" });
    }

    // Find user with specified email, role, and active status
    const user = await prisma.users.findFirst({
      where: {
        email: email,
        role: role,
        status: 'Active'
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        password_hash: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });

    console.log(user);

    if (!user) {
      return res.status(403).json({ error: "Invalid credentials or role specified" });
    }

    let profileData: any = null;

    // Fetch student profile if user is a student
    if (user.role === "Student") {
      try {
        const studentProfile = await prisma.student_profile.findUnique({
          where: {
            student_id: user.user_id
          }
        });

        if (studentProfile) {
    
          const classData =await (prisma as any).Renamedclass.findUnique({
            where: { class_id: studentProfile.class_id },
            select: { class_name: true }
          });

          const sectionData = await prisma.section.findUnique({
            where: { section_id: studentProfile.section_id },
            select: { section_name: true }
          });

          profileData = {
            student_id: studentProfile.student_id,
            roll_number: studentProfile.roll_number,
            class_id: studentProfile.class_id,
            section_id: studentProfile.section_id,
            dob: studentProfile.dob,
            guardian_name: studentProfile.guardian_name,
            guardian_mobile_number: studentProfile.guardian_mobile_number,
            student_mobile_number: studentProfile.student_mobile_number,
            created_at: studentProfile.created_at,
            updated_at: studentProfile.updated_at,
            class_name: classData?.class_name || null,
            section_name: sectionData?.section_name || null
          };
        }
      } catch (error) {
        console.log("Error fetching student profile:", error);
        profileData = null;
      }
    }

    if (user.role === "Teacher") {
      try {
        const teacherProfile = await prisma.teacher_profile.findUnique({
          where: {
            teacher_id: user.user_id
          },
          select: {
            teacher_id: true,
            assigned_subjects: true,
            class_assignments: true,
            created_at: true,
            updated_at: true
          }
        });
        profileData = teacherProfile || null;
      } catch (error) {
        console.log("Error fetching teacher profile:", error);
        profileData = null;
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash!);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobile_number,
        profilePicture: user.profile_picture,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      profile: profileData,
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = (req as any).user as DecodedToken;

    const me = await prisma.users.findUnique({
      where: {
        user_id: userId
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!me) {
      return res.status(404).json({ error: "User not found" });
    }

    let profileData: any = null;

    if (me.role === "Student") {
      try {
        const studentProfile = await prisma.student_profile.findUnique({
          where: {
            student_id: userId
          }
        });

        if (studentProfile) {
          const classData = await (prisma as any).Renamedclass.findUnique({
            where: { class_id: studentProfile.class_id },
            select: { class_name: true }
          });

          const sectionData = await prisma.section.findUnique({
            where: { section_id: studentProfile.section_id },
            select: { section_name: true }
          });

          profileData = {
            student_id: studentProfile.student_id,
            roll_number: studentProfile.roll_number,
            class_id: studentProfile.class_id,
            section_id: studentProfile.section_id,
            dob: studentProfile.dob,
            guardian_name: studentProfile.guardian_name,
            guardian_mobile_number: studentProfile.guardian_mobile_number,
            student_mobile_number: studentProfile.student_mobile_number,
            created_at: studentProfile.created_at,
            updated_at: studentProfile.updated_at,
            class_name: classData?.class_name || null,
            section_name: sectionData?.section_name || null
          };
        }
      } catch (error) {
        console.log("Error fetching student profile:", error);
        profileData = null;
      }
    }

    if (me.role === "Teacher") {
      try {
        const teacherProfile = await prisma.teacher_profile.findUnique({
          where: {
            teacher_id: userId
          },
          select: {
            teacher_id: true,
            assigned_subjects: true,
            class_assignments: true,
            created_at: true,
            updated_at: true
          }
        });
        profileData = teacherProfile || null;
      } catch (error) {
        console.log("Error fetching teacher profile:", error);
        profileData = null;
      }
    }

    return res.json({
      user: me,
      profile: profileData,
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};