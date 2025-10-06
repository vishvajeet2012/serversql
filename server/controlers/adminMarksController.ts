import { Response, NextFunction } from "express";
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";
import { sendPushNotification, sendBulkNotifications } from "../util/sendNotifcationfireBase";

export const adminMarksController = {
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

      const marks = await prisma.marks.findUnique({
        where: { marks_id },
        include: {
          test: {
            select: {
              test_name: true,
              max_marks: true,
              created_by: true,
              subject: {
                select: {
                  subject_name: true,
                },
              },
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
              created_by: true,
              subject: {
                select: {
                  subject_name: true,
                },
              },
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

      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: "APPROVE_MARKS",
          entity_type: "marks",
          entity_id: marks_id,
          remarks: `Approved marks for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name}`
        }
      });

      const teacher = await prisma.users.findUnique({
        where: { user_id: updatedMarks.test.created_by },
        select: { user_id: true, push_token: true }
      });

      if (teacher) {
        // Create notification in database for teacher
        await prisma.notifications.create({
          data: {
            user_id: teacher.user_id,
            title: "Marks Approved",
            message: `Your marks submission for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name} has been approved.`,
            is_read: false,
          }
        });

        // 🔥 FIREBASE FCM: Send push notification to teacher
        if (teacher.push_token) {
          await sendPushNotification({
            token: teacher.push_token,
            title: "Marks Approved",
            body: `Your marks submission for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name} has been approved.`,
            data: {
              type: "marks_approved_teacher",
              marks_id: marks_id.toString(),
              student_name: updatedMarks.student_profile.users.name,
              test_name: updatedMarks.test.test_name,
            },
          });
        }
      }

      // 🔥 FIREBASE FCM: Send notification to STUDENT about marks approval
      const percentage = ((updatedMarks.marks_obtained / updatedMarks.test.max_marks) * 100).toFixed(2);
      
      const studentNotificationMessage = `Your marks for ${updatedMarks.test.test_name} (${updatedMarks.test.subject.subject_name}) have been approved. You scored ${updatedMarks.marks_obtained}/${updatedMarks.test.max_marks} (${percentage}%)`;

      // Create notification for student in database
      await prisma.notifications.create({
        data: {
          user_id: updatedMarks.student_id,
          title: "✅ Marks Approved",
          message: studentNotificationMessage,
          is_read: false,
        }
      });

      // Get student's push token and send notification
      const student = await prisma.users.findUnique({
        where: { user_id: updatedMarks.student_id },
        select: { push_token: true }
      });

      if (student?.push_token) {
        await sendPushNotification({
          token: student.push_token,
          title: "✅ Marks Approved",
          body: studentNotificationMessage,
          data: {
            type: "marks_approved",
            marks_id: marks_id.toString(),
            marks_obtained: updatedMarks.marks_obtained.toString(),
            max_marks: updatedMarks.test.max_marks.toString(),
            percentage: percentage,
            test_name: updatedMarks.test.test_name,
            subject_name: updatedMarks.test.subject.subject_name,
          },
        });

        console.log(`✅ Firebase notification sent to student ${updatedMarks.student_id} for marks approval`);
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

      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: "REJECT_MARKS",
          entity_type: "marks",
          entity_id: marks_id,
          remarks: `Rejected marks for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name}. Reason: ${reason || 'Not specified'}`
        }
      });

      const teacher = await prisma.users.findUnique({
        where: { user_id: updatedMarks.test.created_by },
        select: { user_id: true, push_token: true }
      });

      if (teacher) {
        const rejectionMessage = `Your marks submission for ${updatedMarks.student_profile.users.name} in test: ${updatedMarks.test.test_name} has been rejected. Reason: ${reason || 'Not specified'}`;

        // Create notification in database
        await prisma.notifications.create({
          data: {
            user_id: teacher.user_id,
            title: "Marks Rejected",
            message: rejectionMessage,
            is_read: false,
          }
        });

        // 🔥 FIREBASE FCM: Send push notification to teacher
        if (teacher.push_token) {
          await sendPushNotification({
            token: teacher.push_token,
            title: "Marks Rejected",
            body: rejectionMessage,
            data: {
              type: "marks_rejected",
              marks_id: marks_id.toString(),
              reason: reason || 'Not specified',
              student_name: updatedMarks.student_profile.users.name,
              test_name: updatedMarks.test.test_name,
            },
          });

          console.log(`✅ Firebase notification sent to teacher ${teacher.user_id} for marks rejection`);
        }
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
          { created_at: 'asc' }
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

      const marks = await prisma.marks.findMany({
        where: {
          marks_id: { in: marks_ids },
          status: "PendingApproval"
        },
        include: {
          test: {
            select: {
              test_name: true,
              created_by: true,
              max_marks: true,
              subject: {
                select: {
                  subject_name: true,
                },
              },
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

      await prisma.audit_log.create({
        data: {
          user_id: admin_id!,
          action: "BULK_APPROVE_MARKS",
          entity_type: "marks",
          entity_id: marks_ids[0] || 0,
          remarks: `Bulk approved ${marks_ids.length} marks submissions`
        }
      });

      const teacherNotifications = new Map<number, string[]>();
      const studentNotificationData: Array<{
        userId: number;
        title: string;
        message: string;
        token: string;
        marks: any;
      }> = [];

      // Collect all student and teacher data
      for (const mark of marks) {
        const percentage = ((mark.marks_obtained / mark.test.max_marks) * 100).toFixed(2);
        const studentMessage = `Your marks for ${mark.test.test_name} (${mark.test.subject.subject_name}) have been approved. You scored ${mark.marks_obtained}/${mark.test.max_marks} (${percentage}%)`;

        // Create notification in database for student
        await prisma.notifications.create({
          data: {
            user_id: mark.student_id,
            title: "✅ Marks Approved",
            message: studentMessage,
            is_read: false,
          }
        });

        // Get student push token
        const student = await prisma.users.findUnique({
          where: { user_id: mark.student_id },
          select: { push_token: true }
        });

        if (student?.push_token) {
          studentNotificationData.push({
            userId: mark.student_id,
            title: "✅ Marks Approved",
            message: studentMessage,
            token: student.push_token,
            marks: {
              marks_obtained: mark.marks_obtained,
              max_marks: mark.test.max_marks,
              percentage,
              test_name: mark.test.test_name,
              subject_name: mark.test.subject.subject_name,
            }
          });
        }

        // Collect teacher notifications
        const teacherId = mark.test.created_by;
        const teacherMessage = `Your marks submission for ${mark.student_profile.users.name} in test: ${mark.test.test_name} has been approved.`;

        if (!teacherNotifications.has(teacherId)) {
          teacherNotifications.set(teacherId, []);
        }
        teacherNotifications.get(teacherId)!.push(teacherMessage);
      }

      // 🔥 FIREBASE FCM: Send bulk notifications to students
      if (studentNotificationData.length > 0) {
        const studentTokens = studentNotificationData.map(s => s.token);
        
        await sendBulkNotifications({
          tokens: studentTokens,
          title: "✅ Marks Approved",
          body: `Your marks have been approved. Check the app for details.`,
          data: {
            type: "marks_approved",
            count: studentNotificationData.length.toString(),
          },
        });

        console.log(`✅ Firebase bulk notifications sent to ${studentNotificationData.length} students`);
      }

      // 🔥 FIREBASE FCM: Send notifications to teachers
      const teacherNotificationPromises = Array.from(teacherNotifications.entries()).map(async ([teacherId, messages]) => {
        const notificationMessage = messages.length === 1 
          ? messages[0] as string 
          : `${messages.length} marks submissions have been approved.`;

        // Create notification in database
        await prisma.notifications.create({
          data: {
            user_id: teacherId,
            title: "Marks Approved",
            message: notificationMessage,
            is_read: false,
          }
        });

        // Get teacher push token
        const teacher = await prisma.users.findUnique({
          where: { user_id: teacherId },
          select: { push_token: true }
        });

        // Send push notification
        if (teacher?.push_token) {
          await sendPushNotification({
            token: teacher.push_token,
            title: "Marks Approved",
            body: notificationMessage,
            data: {
              type: "bulk_marks_approved",
              count: messages.length.toString(),
            },
          });
        }
      });

      await Promise.all(teacherNotificationPromises);

      console.log(`✅ Bulk approval complete: ${marks_ids.length} marks approved`);

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
