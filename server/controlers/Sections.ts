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

    // Get section with all related data
    const sectionData = await prisma.section.findUnique({
      where: {
        section_id: sectionId
      },
      include: {
        // Class details
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

    // Get class teacher details if exists
    let classTeacherDetails: TeacherDetail | undefined;
    if (sectionData.class_teacher_id) {
      const classTeacher = await prisma.teacher_profile.findUnique({
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
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};