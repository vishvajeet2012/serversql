import { Request, Response } from "express";
import { sql } from "../db/inidex";
import prisma from './../db/prisma';

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


// export const createClass = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const { className, description, section_name, class_teacher_id } = req.body;

//     if (!className) {
//       return res.status(400).json({ error: "className is required" });
//     }

//     const classResult = await sql`
//       INSERT INTO class (class_name, description) 
//       VALUES (${className}, ${description}) 
//       RETURNING *;
//     `;

//     const createdClass = classResult[0];
//     let createdSection = null;

//     if (section_name) {
//       const sectionResult = await sql`
//         INSERT INTO section (class_id, section_name, class_teacher_id) 
//         VALUES (${createdClass?.class_id}, ${section_name}, ${class_teacher_id || null}) 
//         RETURNING *;
//       `;
      
//       createdSection = sectionResult[0];
//     }

//     return res.status(201).json({
//       message: "Class created successfully",
//       data: {
//         class: createdClass,
//         section: createdSection
//       },
//     });
//   } catch (error) {
//     console.error("Error creating class:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };


export const createClass = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { className, description, section_name, class_teacher_id } = req.body;

    if (!className) {
      return res.status(400).json({ error: "className is required" });
    }

    const createdClass = await (prisma as any).class.create({
      data: {
        class_name: className,
        description: description || null,
      },
    });

    let createdSection = null;

    if (section_name) {
      createdSection = await (prisma as any).section.create({
        data: {
          class_id: createdClass.class_id,
          section_name: section_name,
          class_teacher_id: class_teacher_id || null,
        },
      });
    }

    return res.status(201).json({
      message: "Class created successfully",
      data: {
        class: createdClass,
        section: createdSection,
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

type SearchClassResult = any;


export const searchClassBySectionWithQuery = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { search } = req.body;
    
    const whereClause: any = {};
    
    if (search && search.trim()) {
      whereClause.OR = [
        {
          class_name: {
            contains: search,
            mode: 'insensitive' // Case insensitive search (equivalent to ILIKE)
          }
        },
        {
          section: {
            some: {
              section_name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        }
      ];
    }

    const classes = await (prisma as any).Renamedclass.findMany({
      where: whereClause,
      select: {
        class_id: true,
        class_name: true,
        section: {
          select: {
            section_id: true,
            section_name: true,
          },
          orderBy: {
            section_name: 'asc'
          }
        }
      },
      orderBy: {
        class_name: 'asc'
      }
    });

    const transformedData: SearchClassResult[] = classes.map((classItem: any) => ({
      class_id: classItem.class_id,
      class_name: classItem.class_name,
      sections: classItem.section || []
    }));

    return res.status(200).json({
      message: "Classes with sections retrieved successfully",
      data: transformedData,
    });
  } catch (error) {
    console.error("Error searching classes with sections:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};





export const getAllClassbysection = async (req: Request, res: Response): Promise<Response> => {
  try {
    const classes = await (prisma as any).Renamedclass.findMany({
      include: {
        section: {
          include: {
            student_profile: {
              select: {
                student_id: true, 
              }
            },
            section_teachers: {
              include: {
                teacher_profile: {
                  include: {
                    users: {
                      select: {
                        user_id: true,
                        name: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        class_name: 'asc'
      }
    });

    const sectionIds = classes.flatMap((classItem:any) => 
      classItem.section.map((section:any) => section.section_id)
    );

    const classTeachers = await (prisma as any).teacher_profile.findMany({
      where: {
        teacher_id: {
          in: classes.flatMap((classItem:any) => 
            classItem.section
              .filter((section:any) => section.class_teacher_id)
              .map((section:any) => section.class_teacher_id)
          ).filter(Boolean)
        }
      },
      include: {
        users: {
          select: {
            user_id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    const classTeacherMap = new Map();
    classTeachers.forEach((teacher:any) => {
      classTeacherMap.set(teacher.teacher_id, teacher);
    });

    const transformedData = classes.map((classItem: any) => ({
      class_id: classItem.class_id,
      class_name: classItem.class_name,
      description: classItem.description,
      class_created_at: classItem.created_at,
      class_updated_at: classItem.updated_at,
      sections: classItem.section.map((section: any) => {
        const classTeacher = section.class_teacher_id 
          ? classTeacherMap.get(section.class_teacher_id) 
          : null;

        return {
          section_id: section.section_id,
          section_name: section.section_name,
          total_students: section.student_profile?.length || 0,
          class_teacher_id: section.class_teacher_id,
          section_created_at: section.created_at,
          section_updated_at: section.updated_at,
          class_teacher: classTeacher ? {
            teacher_id: classTeacher.teacher_id,
            name: classTeacher.users.name,
            email: classTeacher.users.email,
            assigned_subjects: classTeacher.assigned_subjects,
            class_assignments: classTeacher.class_assignments,
            created_at: classTeacher.created_at,
            updated_at: classTeacher.updated_at,
          } : null,
          section_teachers: section.section_teachers.map((st: any) => ({
            teacher_id: st.teacher_profile.teacher_id,
            name: st.teacher_profile.users.name,
            email: st.teacher_profile.users.email,
          }))
        };
      }),
    }));

    return res.status(200).json({
      message: "Classes retrieved successfully",
      data: transformedData,
    });
  } catch (error) {
    console.error("Error retrieving classes:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// export const assignTeacherToClassSection = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const { teacher_id, class_id, section_id, isClassTeacher } = req.body;

//     if (!teacher_id || !class_id || !section_id) {
//       return res.status(400).json({
//         error: "teacher_id, class_id, and section_id are required",
//       });
//     }

//     // check user
//     const userData = (await sql`
//       SELECT user_id, name, email, mobile_number, profile_picture,
//              role, status, created_at, updated_at
//       FROM users
//       WHERE user_id = ${teacher_id}
//     `) as UserRow[];

//     if (userData.length === 0) {
//       return res.status(404).json({
//         message: "User not registered",
//       });
//     }

//     const teacherExists = await sql`
//       SELECT teacher_id FROM teacher_profile WHERE teacher_id = ${teacher_id}
//     `;
//     if (teacherExists.length === 0) {
//       return res.status(404).json({ error: "Teacher not found" });
//     }

//     // check class
//     const classExists = await sql`
//       SELECT class_id, class_name FROM class WHERE class_id = ${class_id}
//     `;
//     if (classExists.length === 0) {
//       return res.status(404).json({ error: "Class not found" });
//     }

//     // check section
//     const sectionExists = await sql`
//       SELECT section_id, section_name, class_id 
//       FROM section 
//       WHERE section_id = ${section_id} AND class_id = ${class_id}
//     `;
//     if (sectionExists.length === 0) {
//       return res.status(404).json({
//         error: "Section not found or doesn't belong to the specified class",
//       });
//     }

//     // 👉 Assign teacher
//     if (isClassTeacher) {
//       // main class teacher assign/update
//       await sql`
//         UPDATE section 
//         SET class_teacher_id = ${teacher_id}, updated_at = NOW()
//         WHERE section_id = ${section_id}
//       `;
//     } else {
//       // extra teacher add in mapping table
//       await sql`
//         INSERT INTO section_teachers (section_id, teacher_id)
//         VALUES (${section_id}, ${teacher_id})
//         ON CONFLICT (section_id, teacher_id) DO NOTHING
//       `;
//     }

//     // always update teacher_profile assignments
//     await sql`
//       UPDATE teacher_profile 
//       SET class_assignments = COALESCE(class_assignments, '[]'::jsonb) || ${JSON.stringify([
//         class_id,
//       ])}::jsonb,
//           updated_at = NOW()
//       WHERE teacher_id = ${teacher_id}
//       AND NOT (class_assignments @> ${JSON.stringify([class_id])}::jsonb)
//     `;

//     // ✅ get updated section details
//     const sectionDetails = await sql`
//       SELECT 
//         s.section_id,
//         s.section_name,
//         s.class_id,
//         c.class_name,
//         s.class_teacher_id,
//         u.name as class_teacher_name,
//         u.email as class_teacher_email,
//         u.mobile_number as class_teacher_mobile,
//         u.profile_picture as class_teacher_pic,
//         s.updated_at
//       FROM section s
//       JOIN class c ON s.class_id = c.class_id
//       LEFT JOIN users u ON s.class_teacher_id = u.user_id
//       WHERE s.section_id = ${section_id}
//     `;

//     // ✅ get extra section teachers
//     const extraTeachers = await sql`
//       SELECT 
//         st.teacher_id,
//         u.name as teacher_name,
//         u.email as teacher_email,
//         u.mobile_number,
//         u.profile_picture
//       FROM section_teachers st
//       JOIN users u ON st.teacher_id = u.user_id
//       WHERE st.section_id = ${section_id}
//     `;

//     return res.status(200).json({
//       message: "Teacher assigned successfully",
//       data: {
//         class: {
//           id: sectionDetails[0]?.class_id,
//           name: sectionDetails[0]?.class_name,
//         },
//         section: {
//           id: sectionDetails[0]?.section_id,
//           name: sectionDetails[0]?.section_name,
//           updated_at: sectionDetails[0]?.updated_at,
//           class_teacher: sectionDetails[0]?.class_teacher_id
//             ? {
//                 id: sectionDetails[0]?.class_teacher_id,
//                 name: sectionDetails[0]?.class_teacher_name,
//                 email: sectionDetails[0]?.class_teacher_email,
//                 mobile: sectionDetails[0]?.class_teacher_mobile,
//                 profile_picture: sectionDetails[0]?.class_teacher_pic,
//               }
//             : null,
//           section_teachers: extraTeachers.map((t) => ({
//             id: t.teacher_id,
//             name: t.teacher_name,
//             email: t.teacher_email,
//             mobile: t.mobile_number,
//             profile_picture: t.profile_picture,
//           })),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Error assigning teacher to class section:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };



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

    const userData = await (prisma as any).user.findUnique({
      where: {
        user_id: teacher_id,
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

    if (!userData) {
      return res.status(404).json({
        message: "User not registered",
      });
    }

    const teacherExists = await (prisma as any).teacher.findUnique({
      where: {
        teacher_id: teacher_id,
      },
      select: {
        teacher_id: true,
      },
    });

    if (!teacherExists) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classExists = await (prisma as any).class.findUnique({
      where: {
        class_id: class_id,
      },
      select: {
        class_id: true,
        class_name: true,
      },
    });

    if (!classExists) {
      return res.status(404).json({ error: "Class not found" });
    }

    const sectionExists = await (prisma as any).section.findFirst({
      where: {
        section_id: section_id,
        class_id: class_id,
      },
      select: {
        section_id: true,
        section_name: true,
        class_id: true,
      },
    });

    if (!sectionExists) {
      return res.status(404).json({
        error: "Section not found or doesn't belong to the specified class",
      });
    }

    await (prisma as any).$transaction(async (tx: any) => {
      if (isClassTeacher) {
        await tx.section.update({
          where: {
            section_id: section_id,
          },
          data: {
            class_teacher_id: teacher_id,
            updated_at: new Date(),
          },
        });
      } else {
        await tx.sectionTeacher.upsert({
          where: {
            section_id_teacher_id: {
              section_id: section_id,
              teacher_id: teacher_id,
            },
          },
          update: {}, 
          create: {
            section_id: section_id,
            teacher_id: teacher_id,
          },
        });
      }

      const currentTeacher = await tx.teacher.findUnique({
        where: {
          teacher_id: teacher_id,
        },
        select: {
          class_assignments: true,
        },
      });

      const currentAssignments = currentTeacher?.class_assignments || [];
      const assignmentsArray = Array.isArray(currentAssignments) ? currentAssignments : [];
      
      if (!assignmentsArray.includes(class_id)) {
        await tx.teacher.update({
          where: {
            teacher_id: teacher_id,
          },
          data: {
            class_assignments: [...assignmentsArray, class_id],
            updated_at: new Date(),
          },
        });
      }
    });

    const sectionDetails = await (prisma as any).section.findUnique({
      where: {
        section_id: section_id,
      },
      include: {
        class: {
          select: {
            class_id: true,
            class_name: true,
          },
        },
        classTeacher: {
          include: {
            user: {
              select: {
                user_id: true,
                name: true,
                email: true,
                mobile_number: true,
                profile_picture: true,
              },
            },
          },
        },
        sectionTeachers: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    name: true,
                    email: true,
                    mobile_number: true,
                    profile_picture: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Teacher assigned successfully",
      data: {
        class: {
          id: sectionDetails?.class.class_id,
          name: sectionDetails?.class.class_name,
        },
        section: {
          id: sectionDetails?.section_id,
          name: sectionDetails?.section_name,
          updated_at: sectionDetails?.updated_at,
          class_teacher: sectionDetails?.classTeacher
            ? {
                id: sectionDetails.classTeacher.teacher_id,
                name: sectionDetails.classTeacher.user.name,
                email: sectionDetails.classTeacher.user.email,
                mobile: sectionDetails.classTeacher.user.mobile_number,
                profile_picture: sectionDetails.classTeacher.user.profile_picture,
              }
            : null,
          section_teachers: sectionDetails?.sectionTeachers.map((st: any) => ({
            id: st.teacher.teacher_id,
            name: st.teacher.user.name,
            email: st.teacher.user.email,
            mobile: st.teacher.user.mobile_number,
            profile_picture: st.teacher.user.profile_picture,
          })) || [],
        },
      },
    });
  } catch (error) {
    console.error("Error assigning teacher to class section:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};