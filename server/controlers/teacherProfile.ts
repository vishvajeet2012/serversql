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



// src/controllers/teacherController.ts
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";



// export const getTeacherDashboardData = async (req: RequestWithUser, res: Response) => {
//     const teacherId = req.user?.userId;

//     if (!teacherId) {
//         return res.status(401).json({ error: "Authentication error: User ID not found." });
//     } 

//     try {
//         const teacherAssignments = await prisma.section_teachers.findMany({
//             where: {
//                 teacher_id: teacherId,
//             },
//             include: {
//                 // For each assignment, get the full section details
//                 section: {
//                     include: {
//                         // In each section, get the class it belongs to
//                         Renamedclass: {
//                             include: {
//                                 // For that class, get all its subjects
//                                 subject: true,
//                             }
//                         },
//                         // And in each section, get the list of students
//                         student_profile: {
//                             include: {
//                                 // For each student, get their basic user info (like name)
//                                 users: {
//                                     select: {
//                                         name: true,
//                                         email: true,
//                                         profile_picture: true,
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });
        
//         // 2. Transform the data into a more frontend-friendly structure.
//         // We will group the sections by their parent class.
//         const classDataMap = new Map();

//         for (const assignment of teacherAssignments) {
//             const section = assignment.section;
//             const classInfo = section.Renamedclass;

//             // If we haven't seen this class yet, initialize it.
//             if (!classDataMap.has(classInfo.class_id)) {
//                 classDataMap.set(classInfo.class_id, {
//                     classId: classInfo.class_id,
//                     className: classInfo.class_name,
//                     description: classInfo.description,
//                     // Map subjects to a cleaner format
//                     subjects: classInfo.subject.map(s => ({
//                         subjectId: s.subject_id,
//                         subjectName: s.subject_name
//                     })),
//                     sections: [], // Prepare to add sections to this class
//                 });
//             }

//             // Get the class from the map and add the current section to it.
//             const currentClass = classDataMap.get(classInfo.class_id);
//             currentClass.sections.push({
//                 sectionId: section.section_id,
//                 sectionName: section.section_name,
//                 isClassTeacher: section.class_teacher_id === teacherId, // Check if the teacher is the class teacher
//                 studentCount: section.student_profile.length,
//                 // Map students to a cleaner format
//                 students: section.student_profile.map(sp => ({
//                     studentId: sp.student_id,
//                     name: sp.users.name,
//                     email: sp.users.email,
//                     rollNumber: sp.roll_number,
//                     profilePicture: sp.users.profile_picture
//                 }))
//             });
//         }
        
//         // Convert the map values to an array for the final response
//         const assignedClasses = Array.from(classDataMap.values());

//         // Also fetch teacher's own 
//         const teacherDetails = await prisma.users.findUnique({
//             where: { user_id: teacherId },
//             select: {
//                 user_id: true,
//                 name: true,
//                 email: true,
//                 profile_picture: true
//             }
//         });

//         res.status(200).json({
//             teacherDetails,
//             assignedClasses,
//         });

//     } catch (error) {
//         console.error("Error fetching teacher dashboard data:", error);
//         res.status(500).json({ error: "An internal server error occurred." });
//     }
// };






// export const getTeacherDashboardData = async (req: RequestWithUser, res: Response) => {
//   const teacherId = req.user?.userId;

//   if (!teacherId) {
//       return res.status(401).json({ error: "Authentication error: User ID not found." });
//   } 

//   try {
//       const teacherAssignments = await prisma.section_teachers.findMany({
//           where: {
//               teacher_id: teacherId,
//           },
//           include: {
//               section: {
//                   include: {
//                       Renamedclass: {
//                           include: {
//                               subject: true,
//                           }
//                       },
//                       student_profile: {
//                           include: {
//                               users: {
//                                   select: {
//                                       name: true,
//                                       email: true,
//                                       profile_picture: true,
//                                   }
//                               }
//                           }
//                       },
//                       // Include tests for each section
//                       test: {
//                           include: {
//                               subject: {
//                                   select: {
//                                       subject_name: true,
//                                   }
//                               },
//                               teacher_profile: {
//                                   include: {
//                                       users: {
//                                           select: {
//                                               name: true,
//                                               email: true,
//                                           }
//                                       }
//                                   }
//                               },
//                               marks: {
//                                   include: {
//                                       student_profile: {
//                                           select: {
//                                               student_id: true,
//                                               roll_number: true,
//                                               users: {
//                                                   select: {
//                                                       name: true,
//                                                   }
//                                               }
//                                           }
//                                       }
//                                   }
//                               }
//                           }
//                       }
//                   }
//               }
//           }
//       });
      
//       // Transform the data into a more frontend-friendly structure
//       const classDataMap = new Map();

//       for (const assignment of teacherAssignments) {
//           const section = assignment.section;
//           const classInfo = section.Renamedclass;

//           // If we haven't seen this class yet, initialize it
//           if (!classDataMap.has(classInfo.class_id)) {
//               classDataMap.set(classInfo.class_id, {
//                   classId: classInfo.class_id,
//                   className: classInfo.class_name,
//                   description: classInfo.description,
//                   subjects: classInfo.subject.map(s => ({
//                       subjectId: s.subject_id,
//                       subjectName: s.subject_name
//                   })),
//                   sections: [],
//               });
//           }

//           // Get the class from the map and add the current section to it
//           const currentClass = classDataMap.get(classInfo.class_id);
          
//           // Transform tests data
//           const transformedTests = section.test.map(test => ({
//               testId: test.test_id,
//               testName: test.test_name,
//               subjectName: test.subject.subject_name,
//               dateConducted: test.date_conducted,
//               maxMarks: test.max_marks,
//               testRank: test.test_rank,
//               createdBy: {
//                   teacherId: test.created_by,
//                   teacherName: test.teacher_profile.users.name,
//                   teacherEmail: test.teacher_profile.users.email,
//               },
//               studentMarks: test.marks.map(mark => ({
//                   marksId: mark.marks_id,
//                   studentId: mark.student_profile.student_id,
//                   studentName: mark.student_profile.users.name,
//                   rollNumber: mark.student_profile.roll_number,
//                   marksObtained: mark.marks_obtained,
//                   status: mark.status,
//                   approvedBy: mark.approved_by,
//                   approvedAt: mark.approved_at,
//               })),
//               totalStudents: test.marks.length,
//               averageMarks: test.marks.length > 0 
//                   ? (test.marks.reduce((sum, m) => sum + m.marks_obtained, 0) / test.marks.length).toFixed(2)
//                   : 0,
//           }));

//           currentClass.sections.push({
//               sectionId: section.section_id,
//               sectionName: section.section_name,
//               isClassTeacher: section.class_teacher_id === teacherId,
//               studentCount: section.student_profile.length,
//               students: section.student_profile.map(sp => ({
//                   studentId: sp.student_id,
//                   name: sp.users.name,
//                   email: sp.users.email,
//                   rollNumber: sp.roll_number,
//                   profilePicture: sp.users.profile_picture
//               })),
//               tests: transformedTests,
//               totalTests: transformedTests.length,
//           });
//       }
      
//       // Convert the map values to an array for the final response
//       const assignedClasses = Array.from(classDataMap.values());

//       // Fetch teacher's own details
//       const teacherDetails = await prisma.users.findUnique({
//           where: { user_id: teacherId },
//           select: {
//               user_id: true,
//               name: true,
//               email: true,
//               profile_picture: true
//           }
//       });

//       res.status(200).json({
//           teacherDetails,
//           assignedClasses,
//       });

//   } catch (error) {
//       console.error("Error fetching teacher dashboard data:", error);
//       res.status(500).json({ error: "An internal server error occurred." });
//   }
// };




export const getTeacherDashboardData = async (req: RequestWithUser, res: Response): Promise<Response> => {
  const teacherId = req.user?.userId;

  if (!teacherId) {
      return res.status(401).json({ error: "Authentication error: User ID not found." });
  } 

  try {
      const teacherAssignments = await prisma.section_teachers.findMany({
          where: {
              teacher_id: teacherId,
          },
          include: {
              section: {
                  include: {
                      Renamedclass: {
                          include: {
                              subject: true,
                          }
                      },
                      student_profile: {
                          include: {
                              users: {
                                  select: {
                                      name: true,
                                      email: true,
                                      profile_picture: true,
                                  }
                              }
                          }
                      },
                      test: {
                          include: {
                              subject: {
                                  select: {
                                      subject_name: true,
                                  }
                              },
                              teacher_profile: {
                                  include: {
                                      users: {
                                          select: {
                                              name: true,
                                              email: true,
                                          }
                                      }
                                  }
                              },
                              marks: {
                                  include: {
                                      student_profile: {
                                          select: {
                                              student_id: true,
                                              roll_number: true,
                                              users: {
                                                  select: {
                                                      name: true,
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
          }
      });
      
      const classDataMap = new Map();

      for (const assignment of teacherAssignments) {
          const section = assignment.section;
          const classInfo = section.Renamedclass;

          if (!classDataMap.has(classInfo.class_id)) {
              classDataMap.set(classInfo.class_id, {
                  classId: classInfo.class_id,
                  className: classInfo.class_name,
                  description: classInfo.description,
                  subjects: classInfo.subject.map(s => ({
                      subjectId: s.subject_id,
                      subjectName: s.subject_name
                  })),
                  sections: [],
              });
          }

          const currentClass = classDataMap.get(classInfo.class_id);
          
          const transformedTests = section.test.map(test => ({
              testId: test.test_id,
              testName: test.test_name,
              subjectName: test.subject.subject_name,
              dateConducted: test.date_conducted,
              maxMarks: test.max_marks,
              testRank: test.test_rank,
              createdBy: {
                  teacherId: test.created_by,
                  teacherName: test.teacher_profile.users.name,
                  teacherEmail: test.teacher_profile.users.email,
              },
              studentMarks: test.marks.map(mark => ({
                  marksId: mark.marks_id,
                  studentId: mark.student_profile.student_id,
                  studentName: mark.student_profile.users.name,
                  rollNumber: mark.student_profile.roll_number,
                  marksObtained: mark.marks_obtained,
                  status: mark.status,
                  approvedBy: mark.approved_by,
                  approvedAt: mark.approved_at,
              })),
              totalStudents: test.marks.length,
              averageMarks: test.marks.length > 0 
                  ? (test.marks.reduce((sum, m) => sum + m.marks_obtained, 0) / test.marks.length).toFixed(2)
                  : 0,
          }));

          currentClass.sections.push({
              sectionId: section.section_id,
              sectionName: section.section_name,
              isClassTeacher: section.class_teacher_id === teacherId,
              studentCount: section.student_profile.length,
              students: section.student_profile.map(sp => ({
                  studentId: sp.student_id,
                  name: sp.users.name,
                  email: sp.users.email,
                  rollNumber: sp.roll_number,
                  profilePicture: sp.users.profile_picture
              })),
              tests: transformedTests,
              totalTests: transformedTests.length,
          });
      }
      
      const assignedClasses = Array.from(classDataMap.values());

      const teacherDetails = await prisma.users.findUnique({
          where: { user_id: teacherId },
          select: {
              user_id: true,
              name: true,
              email: true,
              profile_picture: true
          }
      });

      // Add 'return' here
      return res.status(200).json({
          teacherDetails,
          assignedClasses,
      });

  } catch (error) {
      console.error("Error fetching teacher dashboard data:", error);
      return res.status(500).json({ error: "An internal server error occurred." });
  }
};