import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import { sql } from "../db/inidex";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from './../db/prisma';
import { Prisma } from '@prisma/client';

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


type StudentClassAssign = { class_id: number; section_id: number };
type ClassTeacherAssign = { section_id: number; teacher_id?: number };
type SubjectTeacherAssign = { subject_id: number; teacher_id?: number };


/////////////////////

// export const manageStudents =async (req:Request,res:Response): Promise<Response> => {
  
//   try{
//       console.log(req.body)
//           const { status  ,user_id , mobile_number,role, name, email } =  req.body as any

//           const parsedUserId = Number(user_id?.toString().trim())

//           if (!parsedUserId) {
//     return res.status(400).json({
//       message: "user id required plase try again",
//       status: false
//     });}
    
//     if (role === 'Admin') {
// res.status(403).json({
//   message: "You cannot change role to admin — permission not allowed."
// });
// }
    

//   const checkUser=  await sql`
//      SELECT user_id, name, email, mobile_number, profile_picture,
//             role, status, created_at, updated_at
//      FROM users
//      WHERE user_id = ${parsedUserId}
//     ` as User[];



//     if(checkUser.length ===0 ){
//         return res.status(404).json({
//             message:"user not found ",
//             status: false
//         }) }

//       const updateFields: Partial<User> = {};



//     if (name !== undefined) updateFields.name = name;
//     if (email !== undefined) updateFields.email = email;
//     if (mobile_number !== undefined) updateFields.mobile_number = mobile_number;
//     if (role !== undefined) updateFields.role = role;
//     if (status !== undefined) updateFields.status = status;


//     const now = new Date();


//     const updateUser= await sql`
//     UPDATE users 
//     SET
//         name = CASE WHEN ${name !== undefined} THEN ${name} ELSE name END,
//         email = CASE WHEN ${email !== undefined} THEN ${email} ELSE email END,
//         mobile_number = CASE WHEN ${mobile_number !== undefined} THEN ${mobile_number} ELSE mobile_number END,
//         role = CASE WHEN ${role !== undefined} THEN ${role} ELSE role END,
//         status = CASE WHEN ${status !== undefined} THEN ${status} ELSE status END,
//         updated_at = ${now}
//       WHERE user_id = ${parsedUserId}
//       RETURNING user_id, name, email, mobile_number, profile_picture,
//                 role, status, created_at, updated_at
//     ` as User[];
//     if(updateUser){
//     return res.status(200).json({message:"update successfully ",status:true, data:updateUser[0]})
//     }else{
//             return res.status(400).json({message:"error while updateding data  ",status:false,})



//     }
//                     }catch(error){
//                         return res.status(500).json({message:"internal  server error"  ,status:false, 
//                             error:error
//                         })
//                     }




// }

export const manageStudentsss = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(req.body);

    const { status, user_id, mobile_number, role, name, email , assigned , class_assignments , roll_number, class_name,section_name, guardian_name,guardian_mobile_number ,student_mobile_number, dob ,  assigned_subjects_text 
      ,class_assignments_text } = req.body as any;
///assigned_subjects_text = hindi,english math 

    const parsedUserId = Number(user_id?.toString().trim());
    if (!parsedUserId) {
      return res.status(400).json({
        message: "user id required plase try again",
        status: false,
      });
    }

    if (role === "Admin") {
      return res.status(403).json({
        message: "You cannot change role to admin — permission not allowed.",
      });
    }

    const existing = await prisma.users.findUnique({
      where: { user_id: parsedUserId },
      select: { user_id: true },
    });

    if (!existing) {
      return res.status(404).json({
        message: "user not found ",
        status: false,
      });
    }

    const now = new Date();
    const data: any = { updated_at: now };

    if (name !== undefined) data.name = name;            
    if (email !== undefined) data.email = email;         
    if (mobile_number !== undefined) data.mobile_number = mobile_number; // only set if provided
    if (role !== undefined) data.role = role;            // only set if provided
    if (status !== undefined) data.status = status;    

    const updated = await prisma.users.update({
      where: { user_id: parsedUserId },
      data,
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return res
      .status(200)
      .json({ message: "update successfully ", status: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      message: "internal  server error",
      status: false,
      error,
    });
  }
};

export const manageStudents = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log(req.body);

    const { 
      status, 
      user_id, 
      mobile_number, 
      role, 
      name, 
      email, 
      assigned, 
      class_assignments, 
      roll_number, 
      class_name,
      section_name, 
      guardian_name,
      guardian_mobile_number,
      student_mobile_number, 
      dob,  
      assigned_subjects_text,
      class_assignments_text 
    } = req.body as any;

    const parsedUserId = Number(user_id?.toString().trim());
    if (!parsedUserId) {
      return res.status(400).json({
        message: "user id required please try again",
        status: false,
      });
    }

    if (role === "Admin") {
      return res.status(403).json({
        message: "You cannot change role to admin — permission not allowed.",
      });
    }

    // Check if user exists
    const existing = await prisma.users.findUnique({
      where: { user_id: parsedUserId },
      select: { 
        user_id: true, 
        role: true,
        student_profile: {
          select: {
            student_id: true,
            class_id: true,
            section_id: true
          }
        },
        teacher_profile: {
          select: {
            teacher_id: true
          }
        }
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "user not found",
        status: false,
      });
    }

    const now = new Date();
    const userData: any = { updated_at: now };

    if (name !== undefined) userData.name = name;            
    if (email !== undefined) userData.email = email;         
    if (mobile_number !== undefined) userData.mobile_number = mobile_number;
    if (role !== undefined) userData.role = role;            
    if (status !== undefined) userData.status = status;    

    let classId: number | undefined;
    let sectionId: number | undefined;

    if (class_name) {
      const foundClass = await prisma.renamedclass.findFirst({
        where: { class_name: class_name.trim() },
        select: { class_id: true }
      });

      if (!foundClass) {
        return res.status(404).json({
          message: `Class '${class_name}' not found`,
          status: false,
        });
      }
      classId = foundClass.class_id;

      if(section_name) {
        const foundSection = await prisma.section.findFirst({
          where: { 
            class_id: classId,
            section_name: section_name.trim()
          },
          select: { section_id: true }
        });
        if (!foundSection) {
          return res.status(404).json({
            message: `Section '${section_name}' not found in class '${class_name}'`,
            status: false,
          });
        }
        sectionId = foundSection.section_id;
      }
    }

    let assignedSubjects: number[] = [];

if (assigned_subjects_text && classId) {
  const subjectNames = assigned_subjects_text
    .split(",")
    .map((subject: string) => subject.trim())
    .filter((subject: string) => subject.length > 0);

  if (subjectNames.length > 0) {
    // Fetch subjects by classId + subject_name
    const subjects = await prisma.subject.findMany({
      where: {
        class_id: Number(classId),
        subject_name: {
          in: subjectNames,
        },
      },
      select: { subject_id: true, subject_name: true },
    });

    assignedSubjects = subjects.map((subject) => subject.subject_id);

    if (assignedSubjects.length !== subjectNames.length) {
      const foundNames = subjects.map((s) => s.subject_name);
      const notFound = subjectNames.filter((name:any) => !foundNames.includes(name));

      return res.status(404).json({
        message: `Some subjects not found in class '${class_name}': ${notFound.join(", ")}. Please check available subjects.`,
        status: false,
      });
    }
  }
}

    let classAssignments: number[] = [];
    if (class_assignments_text) {
      const classNames = class_assignments_text
        .split(',')
        .map((className: string) => className.trim())
        .filter((className: string) => className.length > 0);

      if (classNames.length > 0) {
        const classes = await prisma.renamedclass.findMany({
          where: {
            class_name: {
              in: classNames
            }
          },
          select: { class_id: true }
        });

        classAssignments = classes.map(cls => cls.class_id);
        
        if (classAssignments.length !== classNames.length) {
          return res.status(404).json({
            message: "Some classes not found in class assignments",
            status: false,
          });
        }
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user data
      const updatedUser = await tx.users.update({
        where: { user_id: parsedUserId },
        data: userData,
        select: {
          user_id: true,
          name: true,
          email: true,
          mobile_number: true,
          profile_picture: true,
          role: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

      // Handle Student Profile Updates
      if (existing.role === "Student" || role === "Student") {
        const studentData: any = { updated_at: now };
        
        if (roll_number !== undefined) studentData.roll_number = roll_number?.toString().trim();
        if (classId !== undefined) studentData.class_id = classId;
        if (sectionId !== undefined) studentData.section_id = sectionId;
        studentData.dob = dob ? new Date(dob) : null;
        if (guardian_name !== undefined) studentData.guardian_name = guardian_name;
        if (guardian_mobile_number !== undefined) studentData.guardian_mobile_number = guardian_mobile_number;
        if (student_mobile_number !== undefined) studentData.student_mobile_number = student_mobile_number;

        if (Object.keys(studentData).length > 1) { // more than just updated_at
          if (existing.student_profile) {
            // Update existing student profile
            await tx.student_profile.update({
              where: { student_id: parsedUserId },
              data: studentData
            });
          } else {
            // Create new student profile - require class_id and section_id
            if (!classId || !sectionId) {
              throw new Error("class_name and section_name are required for creating new student profile");
            }
            if (!roll_number?.toString().trim()) {
              throw new Error("roll_number is required for creating new student profile");
            }

            const baseData = {
              student_id: parsedUserId,
              roll_number: roll_number.toString().trim(),
              class_id: classId,
              section_id: sectionId,
              guardian_name: guardian_name || null,
              guardian_mobile_number: guardian_mobile_number || null,
              student_mobile_number: student_mobile_number || null,
            };

            const studentProfileData: Prisma.student_profileUncheckedCreateInput = {
              ...baseData,
              ...(studentData.dob !== null ? { dob: studentData.dob } : {}),
            };

            await tx.student_profile.create({
              data: studentProfileData
            });
          }
        }
      }

      // Handle Teacher Profile Updates
      if (existing.role === "Teacher" || role === "Teacher") {
        const teacherData: any = { updated_at: now };
        
        if (assignedSubjects.length > 0 || assigned_subjects_text !== undefined) {
          teacherData.assigned_subjects = assignedSubjects;
        }
        if (classAssignments.length > 0 || class_assignments_text !== undefined) {
          teacherData.class_assignments = classAssignments;
        }

        if (Object.keys(teacherData).length > 1) { // more than just updated_at
          if (existing.teacher_profile) {
            // Update existing teacher profile
            await tx.teacher_profile.update({
              where: { teacher_id: parsedUserId },
              data: teacherData
            });
          } else {
            // Create new teacher profile
            await tx.teacher_profile.create({
              data: {
                teacher_id: parsedUserId,
                assigned_subjects: assignedSubjects.length > 0 ? assignedSubjects : null,
                class_assignments: classAssignments.length > 0 ? classAssignments : null,
                ...teacherData
              }
            });
          }
        }
      }

      return updatedUser;
    });

    return res.status(200).json({ 
      message: "Updated successfully", 
      status: true, 
      data: result 
    });

  } catch (error: any) {
    console.error("Error in manageStudents:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
      status: false,
    });
  }
};







export const getAllUserData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { role } = req.body as { role?: 'Admin' | 'Teacher' | 'Student' };

    if (!role) {
      return res.status(400).json({
        message: 'Role is required',
        status: false,
      });
    }

    const validRoles: Array<'Admin' | 'Teacher' | 'Student'> = ['Admin', 'Teacher', 'Student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Role must be Admin, Teacher, or Student',
        status: false,
      });
    }

    const baseOptions: any = {
      where: { role },
      orderBy: { created_at: 'desc' as const },
    };

    if (role === 'Student') {
      baseOptions.include = {
        student_profile: {
          select: {
            student_id: true,
            roll_number: true,
            class_id: true,
            section_id: true,
            dob: true,
            guardian_name: true,
            guardian_mobile_number: true,
            student_mobile_number: true,
            created_at: true,
            updated_at: true,
            Renamedclass: {
              select: { class_name: true },
            },
            section: {
              select: { section_name: true },
            },
          },
        },
      };
    } else if (role === 'Teacher') {
      baseOptions.include = {
        teacher_profile: {
          select: {
            teacher_id: true,
            assigned_subjects: true,
            class_assignments: true,
            created_at: true,
            updated_at: true,
          },
        },
      };
    }

    const users = await prisma.users.findMany(baseOptions);

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: `No ${role}s found`,
        status: false,
      });
    }

    const usersWithProfiles = users.map((u: any) => {
      let profile: any = null;

      if (role === 'Student') {
        const sp = u.student_profile;
        if (sp) {
          profile = {
            student_id: sp.student_id,
            roll_number: sp.roll_number,
            class_id: sp.class_id,
            section_id: sp.section_id,
            dob: sp.dob,
            guardian_name: sp.guardian_name,
            guardian_mobile_number: sp.guardian_mobile_number,
            student_mobile_number: sp.student_mobile_number,
            created_at: sp.created_at,
            updated_at: sp.updated_at,
            class_name: sp.Renamedclass?.class_name ?? null,
            section_name: sp.section?.section_name ?? null,
          };
        }
      } else if (role === 'Teacher') {
        const tp = u.teacher_profile;
        profile = tp
          ? {
              teacher_id: tp.teacher_id,
              assigned_subjects: tp.assigned_subjects,
              class_assignments: tp.class_assignments,
              created_at: tp.created_at,
              updated_at: tp.updated_at,
            }
          : null;
      } else {
        profile = null; // Admin
      }

      // Strip raw relation objects from result
      const {
        student_profile: _student_profile,
        teacher_profile: _teacher_profile,
        ...userBase
      } = u;

      return {
        ...userBase,
        profile,
      };
    });

    return res.status(200).json({
      message: `${role} users data successfully fetched`,
      status: true,
      users: usersWithProfiles,
      count: usersWithProfiles.length,
    });
  } catch (error) {
    console.log(error, 'get all user api not working');
    return res.status(500).json({
      message: 'Internal server error',
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
      // Student fields
      guardianName,
      guardianMobileNumber,
      studentMobileNumber,
      dob,
      classId,
      sectionId,
      rollNumber,
      // Teacher fields
      assignedSubjects,
      classAssignments, // Array of {class_id, section_id}
      subjectAssignments, // Array of {class_id, subject_name}
      isClassTeacher,
      classTeacherForSection // If isClassTeacher is true, this section_id
    } = req.body as {
      email: string;
      name: string;
      role: "Admin" | "Teacher" | "Student";
      mobileNumber?: string;
      profilePicture?: string;
      // Student specific
      guardianName?: string;
      guardianMobileNumber?: string;
      studentMobileNumber?: string;
      dob?: string;
      classId?: string;
      sectionId?: string;
      rollNumber?: number;
      // Teacher specific
      assignedSubjects?: string[];
      classAssignments?: { class_id: number; section_id: number }[];
      subjectAssignments?: { class_id: number; subject_name: string }[];
      isClassTeacher?: boolean;
      classTeacherForSection?: number;
    };

    if (!email || !name || !role) {
      return res.status(400).json({
        error: "Email, name, and role are required fields",
      });
    }

    if (!["Admin", "Teacher", "Student"].includes(role)) {
      return res.status(400).json({
        error: "Role must be Admin, Teacher, or Student",
      });
    }

    const existingUser = await prisma.users.findUnique({
      where: { email },
      select: { email: true },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    if (role === "Teacher") {
      if (classAssignments && classAssignments.length > 0) {
        for (const assignment of classAssignments) {
          // Validate class
          const classExists = await prisma.renamedclass.findUnique({
            where: { class_id: assignment.class_id },
            select: { class_id: true },
          });
          if (!classExists) {
            return res.status(400).json({
              error: `Invalid class ID: ${assignment.class_id}`,
            });
          }

          const sectionExists = await prisma.section.findFirst({
            where: {
              section_id: assignment.section_id,
              class_id: assignment.class_id,
            },
            select: { section_id: true },
          });
          if (!sectionExists) {
            return res.status(400).json({
              error: `Invalid section ID: ${assignment.section_id} for class: ${assignment.class_id}`,
            });
          }
        }
      }

      if (isClassTeacher && classTeacherForSection) {
        const sectionExists = await prisma.section.findUnique({
          where: { section_id: classTeacherForSection },
          select: { section_id: true, class_teacher_id: true },
        });
        if (!sectionExists) {
          return res.status(400).json({
            error: `Invalid section ID for class teacher assignment: ${classTeacherForSection}`,
          });
        }
        if (sectionExists.class_teacher_id) {
          return res.status(409).json({
            error: `Section ${classTeacherForSection} already has a class teacher assigned`,
          });
        }
      }

      if (subjectAssignments && subjectAssignments.length > 0) {
        for (const subjectAssignment of subjectAssignments) {
          const classExists = await prisma.renamedclass.findUnique({
            where: { class_id: subjectAssignment.class_id },
            select: { class_id: true },
          });
          if (!classExists) {
            return res.status(400).json({
              error: `Invalid class ID for subject assignment: ${subjectAssignment.class_id}`,
            });
          }
        }
      }
    }

    if (role === "Student") {
      const numericClassId = classId ? Number(classId) : undefined;
      const numericSectionId = sectionId ? Number(sectionId) : undefined;

      if (numericClassId) {
        const classExists = await prisma.renamedclass.findUnique({
          where: { class_id: numericClassId },
          select: { class_id: true },
        });
        if (!classExists) {
          return res.status(400).json({
            error: "Invalid class ID provided",
          });
        }
      }

      if (numericSectionId) {
        const sectionExists = await prisma.section.findUnique({
          where: { section_id: numericSectionId },
          select: { section_id: true },
        });
        if (!sectionExists) {
          return res.status(400).json({
            error: "Invalid section ID provided",
          });
        }
      }

      // Prisma schema requires roll_number as non-nullable String -> enforce presence
      if (!rollNumber) {
        return res.status(400).json({
          error: "rollNumber is required for Student",
        });
      }

      if (rollNumber && numericSectionId) {
        const rollExists = await prisma.student_profile.findFirst({
          where: {
            section_id: numericSectionId,
            roll_number: String(rollNumber),
          },
          select: { student_id: true },
        });
        if (rollExists) {
          return res.status(409).json({
            error: "Roll number already exists in this section",
          });
        }
      }
    }

    // Create user
    const defaultPassword = "1234567890";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        mobile_number: mobileNumber ?? null,
        profile_picture: profilePicture ?? null,
        password_hash: passwordHash,
        role,
        status: "Active",
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
        updated_at: true,
      },
    });

    if (!newUser) {
      return res.status(500).json({ error: "Failed to create user in database" });
    }

    let profileData: any = null;
    const assignmentResults: any = {};

    // Student profile
    if (role === "Student" && newUser.user_id) {
      const numericClassId = classId ? Number(classId) : undefined;
      const numericSectionId = sectionId ? Number(sectionId) : undefined;

      const studentProfile = await prisma.student_profile.create({
        data: {
          student_id: newUser.user_id,
          roll_number: String(rollNumber!), // enforced above
          class_id: numericClassId ?? 0, // required Int in schema
          section_id: numericSectionId ?? 0, // required Int in schema
          dob: dob ? new Date(dob) : undefined,
          guardian_name: guardianName ?? null,
          guardian_mobile_number: guardianMobileNumber ?? null,
          student_mobile_number: studentMobileNumber ?? null,
        },
      });

      profileData = studentProfile;

      if (numericClassId && numericSectionId) {
        const [cls, sec] = await Promise.all([
          prisma.renamedclass.findUnique({
            where: { class_id: numericClassId },
            select: { class_name: true },
          }),
          prisma.section.findUnique({
            where: { section_id: numericSectionId },
            select: { section_name: true },
          }),
        ]);
        profileData = {
          ...profileData,
          class_name: cls?.class_name,
          section_name: sec?.section_name,
        };
      }
    }

    if (role === "Teacher" && newUser.user_id) {
      const teacherProfile = await prisma.teacher_profile.create({
        data: {
          teacher_id: newUser.user_id,
          assigned_subjects: assignedSubjects ?? [],
          class_assignments: classAssignments ?? [],
        },
      });

      profileData = teacherProfile;

      if (isClassTeacher && classTeacherForSection) {
        await prisma.section.update({
          where: { section_id: classTeacherForSection },
          data: {
            class_teacher_id: newUser.user_id,
          },
        });

        const sectionInfo = await prisma.section.findUnique({
          where: { section_id: classTeacherForSection },
          select: {
            section_id: true,
            section_name: true,
            class_id: true,
            Renamedclass: { select: { class_name: true } },
          },
        });

        assignmentResults.classTeacherAssignment = {
          section_id: sectionInfo?.section_id,
          section_name: sectionInfo?.section_name,
          class_id: sectionInfo?.class_id,
          class_name: sectionInfo?.Renamedclass.class_name,
        };
      }

      if (subjectAssignments && subjectAssignments.length > 0) {
        assignmentResults.subjectAssignments = [];
        for (const subjectAssignment of subjectAssignments) {
          try {
            const existingSubject = await prisma.subject.findFirst({
              where: {
                class_id: subjectAssignment.class_id,
                subject_name: subjectAssignment.subject_name,
              },
              select: { subject_id: true },
            });

            if (existingSubject) {
              await prisma.subject.update({
                where: { subject_id: existingSubject.subject_id },
                data: {
                  subject_teacher_id: newUser.user_id,
                },
              });
            } else {
              await prisma.subject.create({
                data: {
                  class_id: subjectAssignment.class_id,
                  subject_name: subjectAssignment.subject_name,
                  subject_teacher_id: newUser.user_id,
                },
              });
            }

            const cls = await prisma.renamedclass.findUnique({
              where: { class_id: subjectAssignment.class_id },
              select: { class_name: true },
            });

            assignmentResults.subjectAssignments.push({
              class_id: subjectAssignment.class_id,
              class_name: cls?.class_name,
              subject_name: subjectAssignment.subject_name,
              status: existingSubject ? "updated" : "created",
            });
          } catch (err) {
            console.error(`Error assigning subject ${subjectAssignment.subject_name}:`, err);
          }
        }
      }

      if (classAssignments && classAssignments.length > 0) {
        assignmentResults.classAssignments = [];
        for (const assignment of classAssignments) {
          const classSection = await prisma.section.findFirst({
            where: {
              section_id: assignment.section_id,
              class_id: assignment.class_id,
            },
            select: {
              section_id: true,
              section_name: true,
              Renamedclass: { select: { class_id: true, class_name: true } },
            },
          });

          if (classSection) {
            assignmentResults.classAssignments.push({
              class_id: classSection.Renamedclass.class_id,
              section_id: classSection.section_id,
              class_name: classSection.Renamedclass.class_name,
              section_name: classSection.section_name,
            });
          }
        }
      }
    }

    const response: any = {
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
        updatedAt: newUser.updated_at,
      },
      profile: profileData,
    };

    if (role === "Teacher" && Object.keys(assignmentResults).length > 0) {
      response.assignments = assignmentResults;
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error("Add user by admin error:", error);
    return res.status(500).json({
      error: "Failed to create user",
    });
  }
};


export const updateUserAssignments = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;
    const {
      assignedSubjects,
      classAssignments,
      subjectAssignments,
      isClassTeacher,
      classTeacherForSection,
      removeClassTeacher
    } = req.body as {
      assignedSubjects?: string[];
      classAssignments?: {class_id: number, section_id: number}[];
      subjectAssignments?: {class_id: number, subject_name: string}[];
      isClassTeacher?: boolean;
      classTeacherForSection?: number;
      removeClassTeacher?: boolean;
    };

    const userInfo = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userId}
    `;

    if (userInfo.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userInfo[0]?.role !== 'Teacher') {
      return res.status(400).json({ error: "User is not a teacher" });
    }

    const teacherExists = await sql`
      SELECT teacher_id FROM teacher_profile WHERE teacher_id = ${userId}
    `;

    if (teacherExists.length === 0) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    let assignmentResults: any = {};

    // Update teacher profile assignments
    if (assignedSubjects !== undefined || classAssignments !== undefined) {
      await sql`
        UPDATE teacher_profile 
        SET 
          assigned_subjects = ${assignedSubjects ? JSON.stringify(assignedSubjects) : sql`assigned_subjects`}::jsonb,
          class_assignments = ${classAssignments ? JSON.stringify(classAssignments) : sql`class_assignments`}::jsonb,
          updated_at = NOW()
        WHERE teacher_id = ${userId}
      `;
    }

    // Handle class teacher assignment/removal
    if (removeClassTeacher) {
      await sql`
        UPDATE section 
        SET 
          class_teacher_id = NULL,
          updated_at = NOW()
        WHERE class_teacher_id = ${userId}
      `;
      assignmentResults.classTeacherRemoved = true;
    } else if (isClassTeacher && classTeacherForSection) {
      // Remove from previous section if any
      await sql`
        UPDATE section 
        SET 
          class_teacher_id = NULL,
          updated_at = NOW()
        WHERE class_teacher_id = ${userId}
      `;

      // Assign to new section
      await sql`
        UPDATE section 
        SET 
          class_teacher_id = ${userId},
          updated_at = NOW()
        WHERE section_id = ${classTeacherForSection}
      `;

      const sectionInfo = await sql`
        SELECT s.section_id, s.section_name, s.class_id, c.class_name
        FROM section s
        JOIN class c ON s.class_id = c.class_id
        WHERE s.section_id = ${classTeacherForSection}
      `;

      assignmentResults.classTeacherAssignment = {
        section_id: classTeacherForSection,
        section_name: sectionInfo[0]?.section_name,
        class_id: sectionInfo[0]?.class_id,
        class_name: sectionInfo[0]?.class_name
      };
    }

    // Handle subject assignments
    if (subjectAssignments && subjectAssignments.length > 0) {
      // First, remove teacher from all subjects
      await sql`
        UPDATE subject 
        SET 
          subject_teacher_id = NULL,
          updated_at = NOW()
        WHERE subject_teacher_id = ${userId}
      `;

      assignmentResults.subjectAssignments = [];
      
      for (const subjectAssignment of subjectAssignments) {
        try {
          const existingSubject = await sql`
            SELECT subject_id FROM subject 
            WHERE class_id = ${subjectAssignment.class_id} 
            AND subject_name = ${subjectAssignment.subject_name}
          `;

          if (existingSubject.length > 0) {
            await sql`
              UPDATE subject 
              SET 
                subject_teacher_id = ${userId},
                updated_at = NOW()
              WHERE subject_id = ${existingSubject[0]?.subject_id}
            `;
          } else {
            await sql`
              INSERT INTO subject (class_id, subject_name, subject_teacher_id, created_at, updated_at)
              VALUES (${subjectAssignment.class_id}, ${subjectAssignment.subject_name}, ${userId}, NOW(), NOW())
            `;
          }

          const classInfo = await sql`
            SELECT class_name FROM class WHERE class_id = ${subjectAssignment.class_id}
          `;

          assignmentResults.subjectAssignments.push({
            class_id: subjectAssignment.class_id,
            class_name: classInfo[0]?.class_name,
            subject_name: subjectAssignment.subject_name,
            status: existingSubject.length > 0 ? 'updated' : 'created'
          });
        } catch (error) {
          console.error(`Error updating subject ${subjectAssignment.subject_name}:`, error);
        }
      }
    }

    return res.status(200).json({
      message: "Teacher assignments updated successfully",
      assignments: assignmentResults
    });

  } catch (error) {
    console.error("Update user assignments error:", error);
    return res.status(500).json({ 
      error: "Failed to update user assignments" 
    });
  }
};

// Function to get complete teacher information with assignments
export const getTeacherWithAssignments = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { teacherId } = req.params;

    const teacherInfo = await sql`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.mobile_number,
        u.profile_picture,
        u.status,
        tp.assigned_subjects,
        tp.class_assignments,
        tp.created_at as profile_created_at,
        tp.updated_at as profile_updated_at
      FROM users u
      JOIN teacher_profile tp ON u.user_id = tp.teacher_id
      WHERE u.user_id = ${teacherId} AND u.role = 'Teacher'
    `;

    if (teacherInfo.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacher = teacherInfo[0];

    // Get class teacher assignments
    const classTeacherAssignments = await sql`
      SELECT 
        s.section_id,
        s.section_name,
        s.class_id,
        c.class_name,
        COUNT(sp.student_id) as total_students
      FROM section s
      JOIN class c ON s.class_id = c.class_id
      LEFT JOIN student_profile sp ON s.section_id = sp.section_id
      WHERE s.class_teacher_id = ${teacherId}
      GROUP BY s.section_id, s.section_name, s.class_id, c.class_name
    `;

    // Get subject assignments
    const subjectAssignments = await sql`
      SELECT 
        sub.subject_id,
        sub.subject_name,
        sub.class_id,
        c.class_name
      FROM subject sub
      JOIN class c ON sub.class_id = c.class_id
      WHERE sub.subject_teacher_id = ${teacherId}
    `;

    return res.status(200).json({
      message: "Teacher information retrieved successfully",
      data: {
        teacher: {
          id: teacher?.user_id,
          name: teacher?.name,
          email: teacher?.email,
          mobileNumber: teacher?.mobile_number,
          profilePicture: teacher?.profile_picture,
          status: teacher?.status,
          assignedSubjects: teacher?.assigned_subjects,
          classAssignments: teacher?.class_assignments,
          profileCreatedAt: teacher?.profile_created_at,
          profileUpdatedAt: teacher?.profile_updated_at
        },
        classTeacherAssignments: classTeacherAssignments,
        subjectAssignments: subjectAssignments
      }
    });

  } catch (error) {
    console.error("Get teacher with assignments error:", error);
    return res.status(500).json({ 
      error: "Failed to retrieve teacher information" 
    });
  }
};