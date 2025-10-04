// controllers/marksController.ts
import { Response, NextFunction } from "express";
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";
import { createAutoFeedback } from "../util/autoFeedbackHelper";

interface UpdateMarksRequest {
  test_id: number;
  student_id: number;
  marks_obtained: number;
}

interface MarkData {
  student_id: number;
  marks_obtained: number;
}

interface ErrorResult {
  student_id: number;
  error: string;
}

interface SuccessResult {
  student_id: number;
  marks_id: number;
  marks_obtained: number;
  status: string;
}

export const marksController = {
  updateStudentMarks: async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { test_id, student_id, marks_obtained }: UpdateMarksRequest = req.body;
      const teacher_id = req.user?.userId;

      if (!teacher_id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!test_id || !student_id || marks_obtained === undefined) {
        res.status(400).json({ 
          error: "Missing required fields: test_id, student_id, marks_obtained" 
        });
        return;
      }

      const test = await prisma.test.findFirst({
        where: {
          test_id: test_id,
          created_by: teacher_id
        },
        include: {
          Renamedclass: true,
          section: true,
          subject: true
        }
      });

      if (!test) {
        res.status(403).json({ 
          error: "Forbidden: You can only update marks for tests you created" 
        });
        return;
      }

      const student = await prisma.student_profile.findFirst({
        where: {
          student_id: student_id,
          class_id: test.class_id,
          section_id: test.section_id
        }
      });

      if (!student) {
        res.status(404).json({ 
          error: "Student not found in the specified class and section" 
        });
        return;
      }

      if (marks_obtained < 0 || marks_obtained > test.max_marks) {
        res.status(400).json({ 
          error: `Marks must be between 0 and ${test.max_marks}` 
        });
        return;
      }

      const existingMarks = await prisma.marks.findFirst({
        where: {
          test_id: test_id,
          student_id: student_id
        }
      });

      let updatedMarks;
      
      if (existingMarks) {
        updatedMarks = await prisma.marks.update({
          where: {
            marks_id: existingMarks.marks_id
          },
          data: {
            marks_obtained: marks_obtained,
            status: "PendingApproval",
            approved_by: null,
            approved_at: null,
            updated_at: new Date()
          },
          include: {
            test: {
              select: {
                test_name: true,
                max_marks: true,
                date_conducted: true
              }
            },
            student_profile: {
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

        // Delete old auto-feedback
        await prisma.feedback.deleteMany({
          where: {
            test_id: test_id,
            student_id: student_id,
            sender_role: "System"
          }
        });
      } else {
        updatedMarks = await prisma.marks.create({
          data: {
            test_id: test_id,
            student_id: student_id,
            marks_obtained: marks_obtained,
            status: "PendingApproval"
          },
          include: {
            test: {
              select: {
                test_name: true,
                max_marks: true,
                date_conducted: true
              }
            },
            student_profile: {
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
      }

      // 🔥 Create auto-feedback silently
      createAutoFeedback(
        test_id,
        student_id,
        teacher_id,
        marks_obtained,
        test.max_marks
      ).catch(err => console.error("Auto-feedback failed:", err));

      await prisma.audit_log.create({
        data: {
          user_id: teacher_id!,
          action: existingMarks ? "UPDATE_MARKS" : "CREATE_MARKS",
          entity_type: "marks",
          entity_id: updatedMarks.marks_id,
          remarks: `Marks ${existingMarks ? 'updated' : 'created'} for test: ${test.test_name}`
        }
      });

      const admins = await prisma.users.findMany({
        where: {
          role: "Admin",
          status: "Active"
        }
      });

      const notificationPromises = admins.map(admin => 
        prisma.notifications.create({
          data: {
            user_id: admin.user_id,
            title: "Marks Approval Required",
            message: `Teacher has ${existingMarks ? 'updated' : 'submitted'} marks for ${updatedMarks.student_profile.users.name} in test: ${test.test_name}. Approval required.`
          }
        })
      );

      await Promise.all(notificationPromises);

      res.status(200).json({
        message: `Marks ${existingMarks ? 'updated' : 'created'} successfully. Pending admin approval.`,
        data: {
          marks_id: updatedMarks.marks_id,
          student_name: updatedMarks.student_profile.users.name,
          test_name: updatedMarks.test.test_name,
          marks_obtained: updatedMarks.marks_obtained,
          max_marks: updatedMarks.test.max_marks,
          status: updatedMarks.status,
          created_at: updatedMarks.created_at,
          updated_at: updatedMarks.updated_at
        }
      });

    } catch (error) {
      console.error("Error updating marks:", error);
      res.status(500).json({ 
        error: "Internal server error while updating marks" 
      });
    }
  },

  getMyTestMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const teacher_id = req.user?.userId;

      if (!teacher_id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { test_id, status } = req.query;

      const whereCondition: any = {
        test: {
          created_by: teacher_id
        }
      };

      if (test_id) {
        whereCondition.test_id = parseInt(test_id as string);
      }

      if (status) {
        whereCondition.status = status as string;
      }

      const marks = await prisma.marks.findMany({
        where: whereCondition,
        include: {
          test: {
            select: {
              test_id: true,
              test_name: true,
              max_marks: true,
              date_conducted: true,
              Renamedclass: {
                select: {
                  class_name: true
                }
              },
              section: {
                select: {
                  section_name: true
                }
              }
            }
          },
          student_profile: {
            include: {
              users: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          users: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { test_id: 'desc' },
          { created_at: 'desc' }
        ]
      });

      res.status(200).json({
        message: "Marks retrieved successfully",
        data: marks.map(mark => ({
          marks_id: mark.marks_id,
          test_name: mark.test.test_name,
          student_name: mark.student_profile.users.name,
          student_email: mark.student_profile.users.email,
          class_name: mark.test.Renamedclass.class_name,
          section_name: mark.test.section.section_name,
          marks_obtained: mark.marks_obtained,
          max_marks: mark.test.max_marks,
          percentage: ((mark.marks_obtained / mark.test.max_marks) * 100).toFixed(2),
          status: mark.status,
          approved_by: mark.users?.name || null,
          approved_at: mark.approved_at,
          created_at: mark.created_at,
          updated_at: mark.updated_at
        })),
        total: marks.length
      });

    } catch (error) {
      console.error("Error fetching marks:", error);
      res.status(500).json({ 
        error: "Internal server error while fetching marks" 
      });
    }
  },

  bulkUpdateMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const { test_id, marks_data }: { 
        test_id: number; 
        marks_data: Array<MarkData>
      } = req.body;
      const teacher_id = req.user?.userId;

      if (!teacher_id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!test_id || !marks_data || !Array.isArray(marks_data)) {
        res.status(400).json({ 
          error: "Missing required fields: test_id and marks_data array" 
        });
        return;
      }

      const test = await prisma.test.findFirst({
        where: {
          test_id: test_id,
          created_by: teacher_id
        }
      });

      if (!test) {
        res.status(403).json({ 
          error: "Forbidden: You can only update marks for tests you created" 
        });
        return;
      }

      const results: SuccessResult[] = [];
      const errors: ErrorResult[] = [];

      for (const markData of marks_data) {
        try {
          const { student_id, marks_obtained } = markData;

          if (marks_obtained < 0 || marks_obtained > test.max_marks) {
            errors.push({
              student_id,
              error: `Marks must be between 0 and ${test.max_marks}`
            });
            continue;
          }

          const existingMark = await prisma.marks.findFirst({
            where: {
              test_id: test_id,
              student_id: student_id
            }
          });

          let updatedMarks;

          if (existingMark) {
            updatedMarks = await prisma.marks.update({
              where: {
                marks_id: existingMark.marks_id
              },
              data: {
                marks_obtained: marks_obtained,
                status: "PendingApproval",
                approved_by: null,
                approved_at: null,
                updated_at: new Date()
              }
            });

            await prisma.feedback.deleteMany({
              where: {
                test_id: test_id,
                student_id: student_id,
                sender_role: "System"
              }
            });
          } else {
            updatedMarks = await prisma.marks.create({
              data: {
                test_id: test_id,
                student_id: student_id,
                marks_obtained: marks_obtained,
                status: "PendingApproval"
              }
            });
          }

          // Auto-feedback for each
          createAutoFeedback(
            test_id,
            student_id,
            teacher_id,
            marks_obtained,
            test.max_marks
          ).catch(err => console.error(`Auto-feedback failed for student ${student_id}:`, err));

          results.push({
            student_id,
            marks_id: updatedMarks.marks_id,
            marks_obtained,
            status: "Success"
          });

        } catch (error) {
          errors.push({
            student_id: markData.student_id,
            error: "Failed to update marks"
          });
        }
      }

      await prisma.audit_log.create({
        data: {
          user_id: teacher_id!,
          action: "BULK_UPDATE_MARKS",
          entity_type: "marks",
          entity_id: test_id,
          remarks: `Bulk updated marks for ${results.length} students in test: ${test.test_name}`
        }
      });

      res.status(200).json({
        message: "Bulk marks update completed",
        successful_updates: results.length,
        failed_updates: errors.length,
        results,
        errors
      });

    } catch (error) {
      console.error("Error in bulk update marks:", error);
      res.status(500).json({ 
        error: "Internal server error during bulk marks update" 
      });
    }
  }
};
