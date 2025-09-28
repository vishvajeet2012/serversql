import { Request, Response } from 'express';
import prisma from '../db/prisma';

interface SectionDetailsRequest {
  sectionId: number;
  sectionName?: string;
}

interface StudentDetail {
  student_id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  profile_picture: string | null;
  roll_number: string;
  dob: Date | null;
  guardian_name: string | null;
  guardian_mobile_number: string | null;
  student_mobile_number: string | null;
  status: string;
  created_at: Date | null;
  updated_at: Date | null;
}

interface TeacherDetail {
  teacher_id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  profile_picture: string | null;
  assigned_subjects: any;
  class_assignments: any;
  status: string;
  created_at: Date | null;
  updated_at: Date | null;
}

interface SectionDetailsResponse {
  section: {
    section_id: number;
    section_name: string;
    class_id: number;
    class_teacher_id: number | null;
    created_at: Date | null;
    updated_at: Date | null;
    class_details: {
      class_id: number;
      class_name: string;
      description: string | null;
      created_at: Date | null;
      updated_at: Date | null;
    };
    class_teacher_details: TeacherDetail | null;
  };
  students: StudentDetail[];
  section_teachers: TeacherDetail[];
  total_students: number;
  total_section_teachers: number;
}

export const getSectionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId, sectionName }: SectionDetailsRequest = req.body;

    if (!sectionId) {
      res.status(400).json({
        success: false,
        message: 'Section ID is required'
      });
      return;
    }

    const sectionData = await prisma.section.findUnique({
      where: {
        section_id: sectionId
      },
      include: {
        Renamedclass: true,
        
        // All students in this section
        student_profile: {
          include: {
            users: true
          }
        },
        
        // All teachers assigned to this section
        section_teachers: {
          include: {
            teacher_profile: {
              include: {
                users: true
              }
            }
          }
        }
      }
    });

    if (!sectionData) {
      res.status(404).json({
        success: false,
        message: 'Section not found'
      });
      return;
    }

    let classTeacherDetails: TeacherDetail | undefined;
    if (sectionData.class_teacher_id) {
      const classTeacher = await prisma.teacher_profile?.findUnique({
        where: {
          teacher_id: sectionData.class_teacher_id
        },
        include: {
          users: true
        }
      });

      if (classTeacher) {
        classTeacherDetails = {
          teacher_id: classTeacher.teacher_id,
          name: classTeacher.users.name,
          email: classTeacher.users.email,
          mobile_number: classTeacher.users.mobile_number,
          profile_picture: classTeacher.users.profile_picture,
          assigned_subjects: classTeacher.assigned_subjects,
          class_assignments: classTeacher.class_assignments,
          status: classTeacher.users.status,
          created_at: classTeacher.created_at,
          updated_at: classTeacher.updated_at
        };
      }
    }

    // Format student data
    const students: StudentDetail[] = sectionData.student_profile.map(student => ({
      student_id: student.student_id,
      name: student.users.name,
      email: student.users.email,
      mobile_number: student.users.mobile_number,
      profile_picture: student.users.profile_picture,
      roll_number: student.roll_number,
      dob: student.dob,
      guardian_name: student.guardian_name,
      guardian_mobile_number: student.guardian_mobile_number,
      student_mobile_number: student.student_mobile_number,
      status: student.users.status,
      created_at: student.created_at,
      updated_at: student.updated_at
    }));

    // Format section teachers data (excluding class teacher to avoid duplication)
    const sectionTeachers: TeacherDetail[] = sectionData.section_teachers
      .filter(st => st.teacher_id !== sectionData.class_teacher_id) // Exclude class teacher
      .map(sectionTeacher => ({
        teacher_id: sectionTeacher.teacher_profile.teacher_id,
        name: sectionTeacher.teacher_profile.users.name,
        email: sectionTeacher.teacher_profile.users.email,
        mobile_number: sectionTeacher.teacher_profile.users.mobile_number,
        profile_picture: sectionTeacher.teacher_profile.users.profile_picture,
        assigned_subjects: sectionTeacher.teacher_profile.assigned_subjects,
        class_assignments: sectionTeacher.teacher_profile.class_assignments,
        status: sectionTeacher.teacher_profile.users.status,
        created_at: sectionTeacher.teacher_profile.created_at,
        updated_at: sectionTeacher.teacher_profile.updated_at
      }));

    // Prepare response
    const response: SectionDetailsResponse = {
      section: {
        section_id: sectionData.section_id,
        section_name: sectionData.section_name,
        class_id: sectionData.class_id,
        class_teacher_id: sectionData.class_teacher_id,
        created_at: sectionData.created_at,
        updated_at: sectionData.updated_at,
        class_details: {
          class_id: sectionData.Renamedclass.class_id,
          class_name: sectionData.Renamedclass.class_name,
          description: sectionData.Renamedclass.description,
          created_at: sectionData.Renamedclass.created_at,
          updated_at: sectionData.Renamedclass.updated_at
        },
        class_teacher_details: classTeacherDetails||null
      },
      students: students,
      section_teachers: sectionTeachers,
      total_students: students.length,
      total_section_teachers: sectionTeachers.length + (classTeacherDetails ? 1 : 0)
    };

    res.status(200).json({
      success: true,
      message: 'Section details retrieved successfully',
      data: response
    });

  } catch (error) {
    console.error('Error fetching section details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    error :error
    });
  }
};



//////////////////////////////////////////////////


// controllers/Setions.ts

import { Prisma } from '@prisma/client';

// Types for request bodies
interface AddSectionTeacherRequest {
  section_id: number;
  teacher_id: number;
  subject_ids?: number[]; // Optional array of subject IDs to assign
}

interface RemoveSectionTeacherRequest {
  section_id: number;
  teacher_id: number;
  remove_subjects?: boolean; // Option to remove subject assignments too
}

interface AssignedSubject {
  subject_id: number;
  subject_name: string;
  class_id: number;
  assigned_at: string;
}

interface ClassAssignment {
  class_id: number;
  class_name: string;
  section_id: number;
  section_name: string;
  assigned_at: string;
}

// Response types
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export class SectionTeachersController {
  // Add a section teacher  optional subject assignments
  static async addSectionTeacher(
    req: Request<{}, ApiResponse, AddSectionTeacherRequest>,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { section_id, teacher_id, subject_ids = [] } = req.body;

      if (!section_id || !teacher_id) {
        res.status(400).json({
          success: false,
          message: 'Section ID and Teacher ID are required',
          error: 'Missing required fields'
        });
        return;
      }

      // Start transaction for data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Validate that section exists
        const sectionExists = await tx.section.findUnique({
          where: { section_id },
          include: {
            Renamedclass: {
              select: {
                class_id: true,
                class_name: true
              }
            }
          }
        });

        if (!sectionExists) {
          throw new Error(`Section with ID ${section_id} does not exist`);
        }

        // Validate that teacher exists and has teacher role
        const teacherExists = await tx.teacher_profile.findUnique({
          where: { teacher_id },
          include: {
            users: {
              select: {
                role: true,
                status: true,
                name: true,
                email: true
              }
            }
          }
        });

        if (!teacherExists) {
          throw new Error(`Teacher with ID ${teacher_id} does not exist`);
        }

        // Check if teacher is active
        if (teacherExists.users.status !== 'Active') {
          throw new Error('Only active teachers can be assigned to sections');
        }

        // Check if the assignment already exists
        const existingAssignment = await tx.section_teachers.findUnique({
          where: {
            section_id_teacher_id: {
              section_id,
              teacher_id
            }
          }
        });

        if (existingAssignment) {
          throw new Error('Teacher is already assigned to this section');
        }

        // Validate subject IDs if provided
        let validatedSubjects: any[] = [];
        if (subject_ids.length > 0) {
          validatedSubjects = await tx.subject.findMany({
            where: {
              subject_id: { in: subject_ids },
              class_id: sectionExists.Renamedclass.class_id
            },
            select: {
              subject_id: true,
              subject_name: true,
              class_id: true
            }
          });

          if (validatedSubjects.length !== subject_ids.length) {
            const foundIds = validatedSubjects.map(s => s.subject_id);
            const missingIds = subject_ids.filter(id => !foundIds.includes(id));
            throw new Error(`Invalid subject IDs for this class: ${missingIds.join(', ')}`);
          }
        }

        // Create the section teacher assignment
        const sectionTeacher = await tx.section_teachers.create({
          data: {
            section_id,
            teacher_id
          }
        });

        // Update teacher's assigned subjects and class assignments
        const currentAssignedSubjects = (teacherExists?.assigned_subjects as unknown as AssignedSubject[]) || [];
        const currentClassAssignments = (teacherExists?.class_assignments as unknown as ClassAssignment[]) || [];

        // Add new subjects to assigned_subjects JSON field
        const newAssignedSubjects = [
          ...currentAssignedSubjects,
          ...validatedSubjects.map(subject => ({
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            class_id: subject.class_id,
            assigned_at: new Date().toISOString()
          }))
        ];

        // Add class assignment to class_assignments JSON field
        const newClassAssignment: ClassAssignment = {
          class_id: sectionExists.Renamedclass.class_id,
          class_name: sectionExists.Renamedclass.class_name,
          section_id: section_id,
          section_name: sectionExists.section_name,
          assigned_at: new Date().toISOString()
        };

        const updatedClassAssignments = [
          ...currentClassAssignments.filter(ca => 
            !(ca.class_id === sectionExists.Renamedclass.class_id && ca.section_id === section_id)
          ),
          newClassAssignment
        ];

        // Update teacher profile with new assignments - Fixed JSON null handling
        await tx.teacher_profile.update({
          where: { teacher_id },
          data: {
            assigned_subjects: newAssignedSubjects.length > 0 ? newAssignedSubjects : Prisma.JsonNull,
                class_assignments: updatedClassAssignments.length > 0
  ? (updatedClassAssignments as unknown as Prisma.InputJsonValue)
  : Prisma.JsonNull
          }
        });

        return {
          sectionTeacher,
          sectionExists,
          teacherExists,
          assignedSubjects: validatedSubjects,
          newClassAssignment
        };
      });

      res.status(201).json({
        success: true,
        message: 'Teacher successfully assigned to section with subjects',
        data: {
          assignment: {
            id: result.sectionTeacher.id,
            section_id: result.sectionTeacher.section_id,
            teacher_id: result.sectionTeacher.teacher_id,
            created_at: result.sectionTeacher.created_at
          },
          section: {
            section_name: result.sectionExists.section_name,
            class_name: result.sectionExists.Renamedclass.class_name,
            class_id: result.sectionExists.Renamedclass.class_id
          },
          teacher: {
            name: result.teacherExists.users.name,
            email: result.teacherExists.users.email
          },
          assigned_subjects: result.assignedSubjects,
          class_assignment: result.newClassAssignment
        }
      });

    } catch (error: unknown) {
      console.error('Error adding section teacher:', error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'Validation failed'
        });
        return;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          res.status(409).json({
            success: false,
            message: 'Teacher is already assigned to this section',
            error: 'Unique constraint violation'
          });
          return;
        }

        if (error.code === 'P2003') {
          res.status(400).json({
            success: false,
            message: 'Invalid section or teacher ID',
            error: 'Foreign key constraint failed'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'Failed to add section teacher'
      });
    }
  }

  static async removeSectionTeacher(
    req: Request<{}, ApiResponse, RemoveSectionTeacherRequest>,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { section_id, teacher_id, remove_subjects = true } = req.body;

      // Validate required fields
      if (!section_id || !teacher_id) {
        res.status(400).json({
          success: false,
          message: 'Section ID and Teacher ID are required',
          error: 'Missing required fields'
        });
        return;
      }

      // Start transaction for data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Check if the assignment exists
        const existingAssignment = await tx.section_teachers.findUnique({
          where: {
            section_id_teacher_id: {
              section_id,
              teacher_id
            }
          },
          include: {
            section: {
              select: {
                section_name: true,
                Renamedclass: {
                  select: {
                    class_id: true,
                    class_name: true
                  }
                }
              }
            },
            teacher_profile: {
              include: {
                users: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        if (!existingAssignment) {
          throw new Error(`No assignment found for teacher ${teacher_id} in section ${section_id}`);
        }

        // Remove the section teacher assignment
        await tx.section_teachers.delete({
          where: {
            section_id_teacher_id: {
              section_id,
              teacher_id
            }
          }
        });

        let removedSubjects: AssignedSubject[] = [];
        let removedClassAssignment: ClassAssignment | null = null;

        if (remove_subjects) {
          // Get current assignments
          const currentAssignedSubjects = (existingAssignment?.teacher_profile.assigned_subjects as unknown as  AssignedSubject[]) || [];
          const currentClassAssignments = (existingAssignment?.teacher_profile.class_assignments as unknown as ClassAssignment[]) || [];

          const classId = existingAssignment.section.Renamedclass.class_id;

          // Filter out subjects from the removed class
          removedSubjects = currentAssignedSubjects.filter(subject => subject.class_id === classId);
          const updatedAssignedSubjects = currentAssignedSubjects.filter(subject => subject.class_id !== classId);

          // Filter out the specific class assignment
          removedClassAssignment = currentClassAssignments.find(ca => 
            ca.class_id === classId && ca.section_id === section_id
          ) || null;
          
          const updatedClassAssignments = currentClassAssignments.filter(ca => 
            !(ca.class_id === classId && ca.section_id === section_id)
          );

          // Update teacher profile - Fixed JSON null handling
          await tx.teacher_profile.update({
            where: { teacher_id },
            data: {
assigned_subjects:
  updatedAssignedSubjects.length > 0
    ? (updatedAssignedSubjects as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull,
              class_assignments:updatedClassAssignments.length > 0 ? (updatedClassAssignments as unknown as Prisma.InputJsonValue) : Prisma.JsonNull

            }
          });
        }

        return {
          existingAssignment,
          removedSubjects,
          removedClassAssignment
        };
      });

      res.status(200).json({
        success: true,
        message: 'Teacher successfully removed from section',
        data: {
          section_id,
          teacher_id,
          section: {
            section_name: result.existingAssignment.section.section_name,
            class_name: result.existingAssignment.section.Renamedclass.class_name,
            class_id: result.existingAssignment.section.Renamedclass.class_id
          },
          teacher: {
            name: result.existingAssignment.teacher_profile.users.name,
            email: result.existingAssignment.teacher_profile.users.email
          },
          removed_subjects: result.removedSubjects,
          removed_class_assignment: result.removedClassAssignment,
          removed_at: new Date()
        }
      });

    } catch (error: unknown) {
      console.error('Error removing section teacher:', error);

      if (error instanceof Error) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: 'Assignment not found'
        });
        return;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          res.status(404).json({
            success: false,
            message: 'Section teacher assignment not found',
            error: 'Record to delete does not exist'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'Failed to remove section teacher'
      });
    }
  }

  // Get teacher assignments with subjects
  static async getTeacherAssignments(
    req: Request,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { teacher_id, section_id } = req.query;

      let whereClause: Prisma.section_teachersWhereInput = {};

      if (section_id) {
        whereClause.section_id = parseInt(section_id as string);
      }

      if (teacher_id) {
        whereClause.teacher_id = parseInt(teacher_id as string);
      }

      const assignments = await prisma.section_teachers.findMany({
        where: whereClause,
        include: {
          section: {
            select: {
              section_name: true,
              Renamedclass: {
                select: {
                  class_id: true,
                  class_name: true
                }
              }
            }
          },
          teacher_profile: {
            include: {
              users: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      const formattedData = assignments.map(assignment => {
        const assignedSubjects = (assignment.teacher_profile.assigned_subjects as unknown as AssignedSubject[]) || [];
        const classAssignments = (assignment.teacher_profile.class_assignments as unknown as ClassAssignment[]) || [];
        
        const classSubjects = assignedSubjects.filter(
          subject => subject.class_id === assignment.section.Renamedclass.class_id
        );

        const currentClassAssignment = classAssignments.find(
          ca => ca.class_id === assignment.section.Renamedclass.class_id && 
                ca.section_id === assignment.section_id
        );

        return {
          assignment_id: assignment.id,
          section_id: assignment.section_id,
          teacher_id: assignment.teacher_id,
          section_name: assignment.section.section_name,
          class_name: assignment.section.Renamedclass.class_name,
          class_id: assignment.section.Renamedclass.class_id,
          teacher_name: assignment.teacher_profile.users.name,
          teacher_email: assignment.teacher_profile.users.email,
          assigned_subjects: classSubjects,
          class_assignment: currentClassAssignment,
          created_at: assignment.created_at
        };
      });

      res.status(200).json({
        success: true,
        message: 'Teacher assignments retrieved successfully',
        data: {
          count: formattedData.length,
          assignments: formattedData
        }
      });

    } catch (error: unknown) {
      console.error('Error getting teacher assignments:', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'Failed to retrieve teacher assignments'
      });
    }
  }

  // Update subject assignments for existing section teacher
  static async updateSubjectAssignments(
    req: Request<{}, ApiResponse, { section_id: number; teacher_id: number; subject_ids: number[] }>,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { section_id, teacher_id, subject_ids } = req.body;

      // Validate required fields
      if (!section_id || !teacher_id || !Array.isArray(subject_ids)) {
        res.status(400).json({
          success: false,
          message: 'Section ID, Teacher ID, and Subject IDs array are required',
          error: 'Missing required fields'
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Verify assignment exists
        const assignment = await tx.section_teachers.findUnique({
          where: {
            section_id_teacher_id: {
              section_id,
              teacher_id
            }
          },
          include: {
            section: {
              include: {
                Renamedclass: {
                  select: {
                    class_id: true,
                    class_name: true
                  }
                }
              }
            }
          }
        });

        if (!assignment) {
          throw new Error('Section teacher assignment not found');
        }

        // Validate subjects belong to the class
        const validatedSubjects = await tx.subject.findMany({
          where: {
            subject_id: { in: subject_ids },
            class_id: assignment.section.Renamedclass.class_id
          }
        });

        if (validatedSubjects.length !== subject_ids.length) {
          const foundIds = validatedSubjects.map(s => s.subject_id);
          const missingIds = subject_ids.filter(id => !foundIds.includes(id));
          throw new Error(`Invalid subject IDs for this class: ${missingIds.join(', ')}`);
        }

        // Get current teacher profile
        const teacherProfile = await tx.teacher_profile.findUnique({
          where: { teacher_id }
        });

        const currentAssignedSubjects = (teacherProfile?.assigned_subjects as unknown as AssignedSubject[]) || [];
        const classId = assignment.section.Renamedclass.class_id;

        // Remove old subjects for this class and add new ones
        const filteredSubjects = currentAssignedSubjects.filter(subject => subject.class_id !== classId);
        const newSubjects = validatedSubjects.map(subject => ({
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          class_id: subject.class_id,
          assigned_at: new Date().toISOString()
        }));

        const updatedAssignedSubjects = [...filteredSubjects, ...newSubjects];

       await tx.teacher_profile.update({
  where: { teacher_id },
  data: {
    assigned_subjects: updatedAssignedSubjects.length > 0
      ? (updatedAssignedSubjects as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull
  }
});
        return {
          assignment,
          validatedSubjects,
          updatedAssignedSubjects
        };
      });

      res.status(200).json({
        success: true,
        message: 'Subject assignments updated successfully',
        data: {
          section_id,
          teacher_id,
          updated_subjects: result.validatedSubjects,
          total_assigned_subjects: result.updatedAssignedSubjects.length,
          updated_at: new Date()
        }
      });

    } catch (error: unknown) {
      console.error('Error updating subject assignments:', error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'Update failed'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'Failed to update subject assignments'
      });
    }
  }
}


