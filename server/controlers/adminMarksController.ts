import { Response, NextFunction } from "express";
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";

export const adminMarksController = {
  // Admin approves marks
  approveMarks: async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { marks_id }: { marks_id: number } = req.body;
      const admin_id = req.user?.userId;

      if (!marks_id) {
        res.status(400).json({ error: "marks_id is required" });
        return;
      }

      // Find the marks record
      const marks = await prisma.marks.findUnique({
        where: { marks_id },
        include: {
          test: {
            select: {
              test_name: true,
              max_marks: true,
              created_by: true
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

      if (!marks) {
        res.status(404).json({ error: "Marks record not found" });
        return;
      }

      if (marks.status !== "PendingApproval") {
        res.status(400).json({ error: "Marks are not pending approval" });
        return;
      }

      // Update marks status to Approved
      const updatedMarks = await prisma.marks.update({
        where: { marks_id },
        data: {
          status: "Approved",
          approved_by: admin_id!,
          approved_at: new Date()
        },
        include: {
          test: {
            select: {
              test_name: true,
              max_marks: true,
              created_by: true
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
              name: true
            }
          }
        }
      });

      // Create audit log
      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: "APPROVE_MARKS",
          entity_type: "marks",
          entity_id: marks_id,
          remarks: `Approved marks for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name}`
        }
      });

      // Create notification for teacher
      const teacher = await prisma.users.findUnique({
        where: { user_id: updatedMarks.test.created_by }
      });

      if (teacher) {
        await prisma.notifications.create({
          data: {
            user_id: teacher.user_id,
            title: "Marks Approved",
            message: `Your marks submission for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name} has been approved.`
          }
        });
      }

      res.status(200).json({
        message: "Marks approved successfully",
        data: {
          marks_id: updatedMarks.marks_id,
          student_name: updatedMarks.student_profile.users.name,
          test_name: updatedMarks.test.test_name,
          marks_obtained: updatedMarks.marks_obtained,
          status: updatedMarks.status,
          approved_by: updatedMarks.users?.name,
          approved_at: updatedMarks.approved_at
        }
      });

    } catch (error) {
      console.error("Error approving marks:", error);
      res.status(500).json({ error: "Internal server error while approving marks" });
    }
  },

  // Admin rejects marks
  rejectMarks: async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { marks_id, reason }: { marks_id: number; reason?: string } = req.body;
      const admin_id = req.user?.userId;

      if (!marks_id) {
        res.status(400).json({ error: "marks_id is required" });
        return;
      }

      // Find the marks record
      const marks = await prisma.marks.findUnique({
        where: { marks_id },
        include: {
          test: {
            select: {
              test_name: true,
              created_by: true
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

      if (!marks) {
        res.status(404).json({ error: "Marks record not found" });
        return;
      }

      if (marks.status !== "PendingApproval") {
        res.status(400).json({ error: "Marks are not pending approval" });
        return;
      }

      // Update marks status to Rejected
      const updatedMarks = await prisma.marks.update({
        where: { marks_id },
        data: {
          status: "Rejected",
          approved_by: admin_id!,
          approved_at: new Date()
        },
        include: {
          test: {
            select: {
              test_name: true,
              max_marks: true,
              created_by: true
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
              name: true
            }
          }
        }
      });

      // Create audit log
      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: "REJECT_MARKS",
          entity_type: "marks",
          entity_id: marks_id,
          remarks: `Rejected marks for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name}. Reason: ${reason || 'Not specified'}`
        }
      });

      // Create notification for teacher
      const teacher = await prisma.users.findUnique({
        where: { user_id: updatedMarks.test.created_by }
      });

      if (teacher) {
        await prisma.notifications.create({
          data: {
            user_id: teacher.user_id,
            title: "Marks Rejected",
            message: `Your marks submission for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name} has been rejected. Reason: ${reason || 'Not specified'}`
          }
        });
      }

      res.status(200).json({
        message: "Marks rejected successfully",
        data: {
          marks_id: updatedMarks.marks_id,
          student_name: updatedMarks.student_profile.users.name,
          test_name: updatedMarks.test.test_name,
          marks_obtained: updatedMarks.marks_obtained,
          status: updatedMarks.status,
          approved_by: updatedMarks.users?.name,
          approved_at: updatedMarks.approved_at
        }
      });

    } catch (error) {
      console.error("Error rejecting marks:", error);
      res.status(500).json({ error: "Internal server error while rejecting marks" });
    }
  },

  // Get all marks (admin view)
  getAllMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const { test_id, status, class_id, section_id, page = 1, limit = 50 } = req.query;

      const whereCondition: any = {};

      if (test_id) {
        whereCondition.test_id = parseInt(test_id as string);
      }

      if (status) {
        whereCondition.status = status as string;
      }

      if (class_id) {
        whereCondition.test = {
          ...whereCondition.test,
          class_id: parseInt(class_id as string)
        };
      }

      if (section_id) {
        whereCondition.test = {
          ...whereCondition.test,
          section_id: parseInt(section_id as string)
        };
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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
              },
              subject: {
                select: {
                  subject_name: true
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
        ],
        skip,
        take: parseInt(limit as string)
      });

      const total = await prisma.marks.count({ where: whereCondition });

      res.status(200).json({
        message: "Marks retrieved successfully",
        data: marks.map(mark => ({
          marks_id: mark.marks_id,
          test_name: mark.test.test_name,
          subject_name: mark.test.subject.subject_name,
          class_name: mark.test.Renamedclass.class_name,
          section_name: mark.test.section.section_name,
          student_name: mark.student_profile.users.name,
          student_email: mark.student_profile.users.email,
          marks_obtained: mark.marks_obtained,
          max_marks: mark.test.max_marks,
          percentage: ((mark.marks_obtained / mark.test.max_marks) * 100).toFixed(2),
          status: mark.status,
          approved_by: mark.users?.name || null,
          approved_at: mark.approved_at,
          created_at: mark.created_at,
          updated_at: mark.updated_at
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });

    } catch (error) {
      console.error("Error fetching all marks:", error);
      res.status(500).json({ error: "Internal server error while fetching marks" });
    }
  },

  // Get pending marks for approval
  getPendingMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const body = req.body || {};
      const page = Number(body.page) || 1;
      const limit = Number(body.limit) || 50;

      const skip = (page - 1) * limit;

      const marks = await prisma.marks.findMany({
        where: {
          status: "PendingApproval"
        },
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
              },
              subject: {
                select: {
                  subject_name: true
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
        orderBy: [
          { created_at: 'asc' } // Oldest first for approval queue
        ],
        skip,
        take: limit
      });

      const total = await prisma.marks.count({
        where: { status: "PendingApproval" }
      });

      res.status(200).json({
        message: "Pending marks retrieved successfully",
        data: marks.map(mark => ({
          marks_id: mark.marks_id,
          test_name: mark.test.test_name,
          subject_name: mark.test.subject.subject_name,
          class_name: mark.test.Renamedclass.class_name,
          section_name: mark.test.section.section_name,
          student_name: mark.student_profile.users.name,
          student_email: mark.student_profile.users.email,
          marks_obtained: mark.marks_obtained,
          max_marks: mark.test.max_marks,
          percentage: ((mark.marks_obtained / mark.test.max_marks) * 100).toFixed(2),
          status: mark.status,
          created_at: mark.created_at,
          updated_at: mark.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error("Error fetching pending marks:", error);
      res.status(500).json({ error: "Internal server error while fetching pending marks" });
    }
  },

  // Bulk approve marks
  bulkApproveMarks: async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const { marks_ids }: { marks_ids: number[] } = req.body;
      const admin_id = req.user?.userId;

      if (!marks_ids || !Array.isArray(marks_ids) || marks_ids.length === 0) {
        res.status(400).json({ error: "marks_ids array is required and cannot be empty" });
        return;
      }

      // Verify all marks exist and are pending
      const marks = await prisma.marks.findMany({
        where: {
          marks_id: { in: marks_ids },
          status: "PendingApproval"
        },
        include: {
          test: {
            select: {
              test_name: true,
              created_by: true
            }
          },
          student_profile: {
            include: {
              users: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (marks.length !== marks_ids.length) {
        res.status(400).json({ error: "Some marks are not found or not pending approval" });
        return;
      }

      // Bulk update
      await prisma.marks.updateMany({
        where: {
          marks_id: { in: marks_ids }
        },
        data: {
          status: "Approved",
          approved_by: admin_id!,
          approved_at: new Date()
        }
      });

      // Create audit log
      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: "BULK_APPROVE_MARKS",
          entity_type: "marks",
          entity_id: marks_ids[0], 
          remarks: `Bulk approved ${marks_ids.length} marks submissions`
        }
      });

      // Create notifications for teachers
      const teacherNotifications = new Map<number, string[]>();

      marks.forEach(mark => {
        const teacherId = mark.test.created_by;
        const message = `Your marks submission for ${mark.student_profile.users.name} in test: ${mark.test.test_name} has been approved.`;

        if (!teacherNotifications.has(teacherId)) {
          teacherNotifications.set(teacherId, []);
        }
        teacherNotifications.get(teacherId)!.push(message);
      });

      const notificationPromises = Array.from(teacherNotifications.entries()).map(([teacherId, messages]) =>
        prisma.notifications.create({
          data: {
            user_id: teacherId,
            title: "Marks Approved",
            message: messages.length === 1 ? messages[0] : `Multiple marks submissions have been approved.`
          }
        })
      );

      await Promise.all(notificationPromises);

      res.status(200).json({
        message: `Successfully approved ${marks_ids.length} marks submissions`,
        approved_count: marks_ids.length
      });

    } catch (error) {
      console.error("Error in bulk approve marks:", error);
      res.status(500).json({ error: "Internal server error during bulk approval" });
    }
  }
};
