import { Response, NextFunction } from "express";
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";



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
  // Teacher updates student marks for tests they created
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

      // Validate required fields
      if (!test_id || !student_id || marks_obtained === undefined) {
        res.status(400).json({ 
          error: "Missing required fields: test_id, student_id, marks_obtained" 
        });
        return;
      }

      // Verify the test exists and was created by this teacher
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

      // Verify student exists and belongs to the test's class and section
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

      // Validate marks are within range
      if (marks_obtained < 0 || marks_obtained > test.max_marks) {
        res.status(400).json({ 
          error: `Marks must be between 0 and ${test.max_marks}` 
        });
        return;
      }

      // Check if marks record already exists
      const existingMarks = await prisma.marks.findFirst({
        where: {
          test_id: test_id,
          student_id: student_id
        }
      });

      let updatedMarks;
      
      if (existingMarks) {
        // Update existing marks record
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
      } else {
        // Create new marks record
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

      // Create audit log entry
      await prisma.audit_log.create({
        data: {
          user_id: teacher_id!,
          action: existingMarks ? "UPDATE_MARKS" : "CREATE_MARKS",
          entity_type: "marks",
          entity_id: updatedMarks.marks_id,
          remarks: `Marks ${existingMarks ? 'updated' : 'created'} for test: ${test.test_name}`
        }
      });

      // Create notification for admin
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

  // Get marks for tests created by the teacher
  getMyTestMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const teacher_id = req.user?.userId; // Changed from user_id to userId
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

  // Bulk update marks for multiple students
  bulkUpdateMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const { test_id, marks_data }: { 
        test_id: number; 
        marks_data: Array<MarkData>
      } = req.body;
      const teacher_id = req.user?.userId; // Changed from user_id to userId

      if (!test_id || !marks_data || !Array.isArray(marks_data)) {
        res.status(400).json({ 
          error: "Missing required fields: test_id and marks_data array" 
        });
        return;
      }

      // Verify the test exists and was created by this teacher
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

      const results: SuccessResult[] = []; // Explicitly typed array
      const errors: ErrorResult[] = []; // Explicitly typed array

      for (const markData of marks_data) {
        try {
          const { student_id, marks_obtained } = markData;

          // Validate marks range
          if (marks_obtained < 0 || marks_obtained > test.max_marks) {
            errors.push({
              student_id,
              error: `Marks must be between 0 and ${test.max_marks}`
            });
            continue;
          }

          // Use findFirst and then upsert logic since composite unique constraint might not exist
          const existingMark = await prisma.marks.findFirst({
            where: {
              test_id: test_id,
              student_id: student_id
            }
          });

          let updatedMarks;

          if (existingMark) {
            // Update existing record
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
          } else {
            // Create new record
            updatedMarks = await prisma.marks.create({
              data: {
                test_id: test_id,
                student_id: student_id,
                marks_obtained: marks_obtained,
                status: "PendingApproval"
              }
            });
          }

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

      // Create audit log for bulk operation
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
}




export const adminMarksController = {
  // Get all pending marks for approval
  getPendingMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const { page = 1, limit = 10, class_id, section_id } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const whereCondition: any = {
        status: "PendingApproval"
      };

      if (class_id) {
        whereCondition.test = {
          class_id: parseInt(class_id as string)
        };
      }

      if (section_id) {
        if (whereCondition.test) {
          whereCondition.test.section_id = parseInt(section_id as string);
        } else {
          whereCondition.test = {
            section_id: parseInt(section_id as string)
          };
        }
      }

      const [pendingMarks, total] = await Promise.all([
        prisma.marks.findMany({
          where: whereCondition,
          include: {
            test: {
              include: {
                Renamedclass: true,
                section: true,
                subject: true,
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
          },
          skip,
          take: parseInt(limit as string),
          orderBy: { created_at: 'desc' }
        }),
        prisma.marks.count({ where: whereCondition })
      ]);

      res.status(200).json({
        message: "Pending marks retrieved successfully",
        data: pendingMarks,
        pagination: {
          current_page: parseInt(page as string),
          total_pages: Math.ceil(total / parseInt(limit as string)),
          total_records: total,
          records_per_page: parseInt(limit as string)
        }
      });

    } catch (error) {
      console.error("Error fetching pending marks:", error);
      res.status(500).json({ 
        error: "Internal server error while fetching pending marks" 
      });
    }
  },

  // Approve or reject marks
  approveMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const { marks_id, action, remarks } = req.body; 
      const admin_id = req.user?.user_id;

      if (!marks_id || !action) {
        res.status(400).json({ 
          error: "Missing required fields: marks_id and action" 
        });
        return;
      }

      if (!['approve', 'reject'].includes(action)) {
        res.status(400).json({ 
          error: "Action must be either 'approve' or 'reject'" 
        });
        return;
      }

      const marks = await prisma.marks.findUnique({
        where: { marks_id },
        include: {
          test: {
            include: {
              teacher_profile: {
                include: {
                  users: true
                }
              }
            }
          },
          student_profile: {
            include: {
              users: true
            }
          }
        }
      });

      if (!marks) {
        res.status(404).json({ error: "Marks record not found" });
        return;
      }

      if (marks.status !== "PendingApproval") {
        res.status(400).json({ 
          error: `Marks already ${marks?.status?.toLowerCase() ||false}` 
        });
        return;
      }

      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      const updatedMarks = await prisma.marks.update({
        where: { marks_id },
        data: {
          status: newStatus,
          approved_by: admin_id,
          approved_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create audit log
      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: action.toUpperCase() + "_MARKS",
          entity_type: "marks",
          entity_id: marks_id,
          remarks: remarks || `Marks ${action}d for student ${marks.student_profile.users.name}`
        }
      });

      // Notify teacher and student
      const notifications = [
        // Notify teacher
        {
          user_id: marks.test.teacher_profile.users.user_id,
          title: `Marks ${action}d`,
          message: `Your submitted marks for ${marks.student_profile.users.name} have been ${action}d by admin.`
        }
      ];

      // Notify student only if approved
      if (action === 'approve') {
        notifications.push({
          user_id: marks.student_profile.users.user_id,
          title: "New Test Results Available",
          message: `Your test results for ${marks.test.test_name} are now available.`
        });
      }

      await Promise.all(
        notifications.map(notification => 
          prisma.notifications.create({ data: notification })
        )
      );

      res.status(200).json({
        message: `Marks ${action}d successfully`,
        data: {
          marks_id: updatedMarks.marks_id,
          status: updatedMarks.status,
          approved_by: admin_id,
          approved_at: updatedMarks.approved_at
        }
      });

    } catch (error) {
      console.error("Error approving marks:", error);
      res.status(500).json({ 
        error: "Internal server error while processing marks approval" 
      });
    }
  }
};