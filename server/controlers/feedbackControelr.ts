import { Response } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";
import { sendPushNotification } from "../util/sendNotifcationfireBase";

export const feedbackController = {
  // 1️⃣ Universal Get Test Feedbacks (Role-based)
  getTestFeedbacks: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { test_id } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!test_id || !userId || !userRole) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Get test details
      const test = await prisma.test.findUnique({
        where: { test_id: parseInt(test_id) },
        include: {
          subject: { select: { subject_name: true } },
          Renamedclass: { select: { class_name: true } },
          section: { select: { section_name: true } },
          teacher_profile: {
            include: {
              users: { select: { name: true } }
            }
          }
        }
      });

      if (!test) {
        res.status(404).json({ error: "Test not found" });
        return;
      }

      const test_details = {
        test_id: test.test_id,
        test_name: test.test_name,
        subject_name: test.subject.subject_name,
        teacher_name: test.teacher_profile.users.name,
        class_name: test.Renamedclass.class_name,
        section_name: test.section.section_name,
        date_conducted: test.date_conducted.toISOString().split('T')[0],
        max_marks: test.max_marks
      };

      // =====================
      // STUDENT RESPONSE
      // =====================
      if (userRole === "Student") {
        const myMarks = await prisma.marks.findFirst({
          where: {
            test_id: parseInt(test_id),
            student_id: userId,
            status: "Approved"
          }
        });

        if (!myMarks) {
          res.status(403).json({ 
            error: "Marks not approved yet or not found",
            test_details 
          });
          return;
        }

        const feedbacks = await prisma.feedback.findMany({
          where: {
            test_id: parseInt(test_id),
            student_id: userId
          },
          include: {
            creator: {
              select: {
                name: true,
                profile_picture: true,
                role: true
              }
            }
          },
          orderBy: { created_at: "asc" }
        });

        const formattedFeedbacks = feedbacks.map(fb => ({
          feedback_id: fb.feedback_id,
          sender_role: fb.sender_role,
          sender_name: fb.creator.name,
          message: fb.message,
          created_at: fb.created_at,
          is_my_reply: fb.sender_role === "Student"
        }));

        const percentage = (myMarks.marks_obtained / test.max_marks) * 100;

        res.status(200).json({
          success: true,
          test_details,
          my_marks: {
            marks_obtained: myMarks.marks_obtained,
            percentage: parseFloat(percentage.toFixed(2)),
            status: myMarks.status
          },
          feedbacks: formattedFeedbacks,
          total_feedbacks: formattedFeedbacks.length
        });
        return;
      }

      // =====================
      // TEACHER RESPONSE
      // =====================
      if (userRole === "Teacher") {
        if (test.created_by !== userId) {
          res.status(403).json({ error: "Not authorized to view this test" });
          return;
        }

        const approvedMarks = await prisma.marks.findMany({
          where: {
            test_id: parseInt(test_id),
            status: "Approved"
          },
          include: {
            student_profile: {
              include: {
                users: {
                  select: {
                    name: true,
                    profile_picture: true
                  }
                }
              }
            }
          }
        });

        const studentsWithFeedback = [];
        for (const mark of approvedMarks) {
          const feedbacks = await prisma.feedback.findMany({
            where: {
              test_id: parseInt(test_id),
              student_id: mark.student_id
            },
            include: {
              creator: {
                select: {
                  name: true,
                  role: true
                }
              }
            },
            orderBy: { created_at: "asc" }
          });

          if (feedbacks.length > 0) {
            const percentage = (mark.marks_obtained / test.max_marks) * 100;
            studentsWithFeedback.push({
              student_id: mark.student_id,
              student_name: mark.student_profile.users.name,
              roll_number: mark.student_profile.roll_number,
              marks_obtained: mark.marks_obtained,
              percentage: parseFloat(percentage.toFixed(2)),
              feedbacks: feedbacks.map(fb => ({
                feedback_id: fb.feedback_id,
                sender_role: fb.sender_role,
                sender_name: fb.creator.name,
                message: fb.message,
                created_at: fb.created_at
              })),
              total_feedbacks: feedbacks.length
            });
          }
        }

        studentsWithFeedback.sort((a, b) => 
          a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true })
        );

        res.status(200).json({
          success: true,
          test_details,
          class_stats: {
            total_students: approvedMarks.length,
            approved_marks: approvedMarks.length,
            students_with_feedback: studentsWithFeedback.length
          },
          students: studentsWithFeedback
        });
        return;
      }

      // =====================
      // ADMIN RESPONSE
      // =====================
      if (userRole === "Admin") {
        const allMarks = await prisma.marks.findMany({
          where: { test_id: parseInt(test_id) },
          include: {
            student_profile: {
              include: {
                users: {
                  select: {
                    name: true,
                    profile_picture: true
                  }
                }
              }
            }
          }
        });

        const studentsWithFeedback = [];
        for (const mark of allMarks) {
          const feedbacks = await prisma.feedback.findMany({
            where: {
              test_id: parseInt(test_id),
              student_id: mark.student_id
            },
            include: {
              creator: {
                select: {
                  name: true,
                  role: true
                }
              }
            },
            orderBy: { created_at: "asc" }
          });

          if (feedbacks.length > 0) {
            const percentage = (mark.marks_obtained / test.max_marks) * 100;
            studentsWithFeedback.push({
              student_id: mark.student_id,
              student_name: mark.student_profile.users.name,
              roll_number: mark.student_profile.roll_number,
              marks_obtained: mark.marks_obtained,
              percentage: parseFloat(percentage.toFixed(2)),
              status: mark.status,
              feedbacks: feedbacks.map(fb => ({
                feedback_id: fb.feedback_id,
                sender_role: fb.sender_role,
                sender_name: fb.creator.name,
                message: fb.message,
                created_at: fb.created_at
              })),
              total_feedbacks: feedbacks.length
            });
          }
        }

        studentsWithFeedback.sort((a, b) => 
          a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true })
        );

        const allFeedbacks = await prisma.feedback.findMany({
          where: { test_id: parseInt(test_id) }
        });

        const feedbackStats = {
          total_feedbacks: allFeedbacks.length,
          system_auto: allFeedbacks.filter(fb => fb.sender_role === "System").length,
          teacher_manual: allFeedbacks.filter(fb => fb.sender_role === "Teacher").length,
          admin_manual: allFeedbacks.filter(fb => fb.sender_role === "Admin").length,
          student_replies: allFeedbacks.filter(fb => fb.sender_role === "Student").length
        };

        const statusCounts = {
          approved: allMarks.filter(m => m.status === "Approved").length,
          pending: allMarks.filter(m => m.status === "PendingApproval").length,
          rejected: allMarks.filter(m => m.status === "Rejected").length
        };

        res.status(200).json({
          success: true,
          test_details,
          class_stats: {
            total_students: allMarks.length,
            approved: statusCounts.approved,
            pending: statusCounts.pending,
            rejected: statusCounts.rejected,
            students_with_feedback: studentsWithFeedback.length
          },
          feedback_stats: feedbackStats,
          students: studentsWithFeedback
        });
        return;
      }

      res.status(403).json({ error: "Invalid role" });
    } catch (error) {
      console.error("Error getting test feedbacks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // 2️⃣ Create Feedback (Admin/Teacher)
  createFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { test_id, student_id, message } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !test_id || !student_id || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      if (userRole !== "Admin" && userRole !== "Teacher") {
        res.status(403).json({ error: "Only Admin and Teacher can create feedback" });
        return;
      }

      const marks = await prisma.marks.findFirst({
        where: {
          test_id: parseInt(test_id),
          student_id: parseInt(student_id),
          status: "Approved"
        },
        include: {
          test: {
            select: {
              test_name: true,
              created_by: true
            }
          }
        }
      });

      if (!marks) {
        res.status(400).json({ error: "Marks must be approved first" });
        return;
      }

      if (userRole === "Teacher" && marks.test.created_by !== userId) {
        res.status(403).json({ error: "You can only give feedback on your own tests" });
        return;
      }

      const feedback = await prisma.feedback.create({
        data: {
          teacher_id: marks.test.created_by,
          student_id: parseInt(student_id),
          test_id: parseInt(test_id),
          message,
          created_by: userId,
          sender_role: userRole
        },
        include: {
          creator: {
            select: {
              name: true
            }
          }
        }
      });

      // Create notification in database
      await prisma.notifications.create({
        data: {
          user_id: parseInt(student_id),
          title: `💬 New Feedback from ${userRole}`,
          message: `${feedback.creator.name} gave you feedback on ${marks.test.test_name}`,
          is_read: false,
        }
      });

      // 🔥 FIREBASE FCM: Send push notification to student
      const student = await prisma.users.findUnique({
        where: { user_id: parseInt(student_id) },
        select: { push_token: true }
      });

      if (student?.push_token) {
        await sendPushNotification({
          token: student.push_token,
          title: `💬 New Feedback from ${userRole}`,
          body: `${feedback.creator.name} gave you feedback on ${marks.test.test_name}`,
          data: {
            type: "feedback_created",
            feedback_id: feedback.feedback_id.toString(),
            test_id: test_id.toString(),
            sender_role: userRole,
          },
        });

        console.log(`✅ Firebase notification sent to student ${student_id} for new feedback`);
      }

      // Audit log
      await prisma.audit_log.create({
        data: {
          user_id: userId,
          action: "CREATE_FEEDBACK",
          entity_type: "feedback",
          entity_id: feedback.feedback_id,
          remarks: `${userRole} gave feedback to student ${student_id}`
        }
      });

      res.status(201).json({
        success: true,
        message: "Feedback created successfully",
        data: feedback
      });
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // 3️⃣ Edit Feedback (Admin/Teacher)
  editFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { feedback_id, message } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !feedback_id || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const feedback = await prisma.feedback.findUnique({
        where: { feedback_id: parseInt(feedback_id) }
      });

      if (!feedback) {
        res.status(404).json({ error: "Feedback not found" });
        return;
      }

      // Admin can edit any feedback
      if (userRole === "Admin") {
        const updated = await prisma.feedback.update({
          where: { feedback_id: parseInt(feedback_id) },
          data: {
            message,
            updated_at: new Date()
          }
        });

        await prisma.audit_log.create({
          data: {
            user_id: userId,
            action: "EDIT_FEEDBACK",
            entity_type: "feedback",
            entity_id: parseInt(feedback_id),
            remarks: "Admin edited feedback"
          }
        });

        res.status(200).json({
          success: true,
          message: "Feedback updated successfully",
          data: updated
        });
        return;
      }

      // Teacher can edit System or own Teacher feedbacks
      if (userRole === "Teacher") {
        const canEdit =
          feedback.sender_role === "System" ||
          (feedback.sender_role === "Teacher" && feedback.created_by === userId);

        if (!canEdit) {
          res.status(403).json({ error: "You can only edit auto-generated or your own feedbacks" });
          return;
        }

        const updated = await prisma.feedback.update({
          where: { feedback_id: parseInt(feedback_id) },
          data: {
            message,
            updated_at: new Date()
          }
        });

        await prisma.audit_log.create({
          data: {
            user_id: userId,
            action: "EDIT_FEEDBACK",
            entity_type: "feedback",
            entity_id: parseInt(feedback_id),
            remarks: "Teacher edited feedback"
          }
        });

        res.status(200).json({
          success: true,
          message: "Feedback updated successfully",
          data: updated
        });
        return;
      }

      res.status(403).json({ error: "Not authorized to edit feedback" });
    } catch (error) {
      console.error("Error editing feedback:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // 4️⃣ Reply to Feedback 
  replyToFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { feedback_id, message } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
  
      if (!userId || !feedback_id || !message || !userRole) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
  
      const originalFeedback = await prisma.feedback.findUnique({
        where: { feedback_id: parseInt(feedback_id) },
        include: {
          creator: {
            select: {
              user_id: true,
              name: true
            }
          },
          test: {
            select: {
              test_name: true,
              created_by: true
            }
          }
        }
      });
  
      if (!originalFeedback) {
        res.status(404).json({ error: "Original feedback not found" });
        return;
      }
  
      // =====================
      // STUDENT REPLY
      // =====================
      if (userRole === "Student") {
        if (originalFeedback.student_id !== userId) {
          res.status(403).json({ error: "You can only reply to your own feedback" });
          return;
        }
  
        const reply = await prisma.feedback.create({
          data: {
            teacher_id: originalFeedback.teacher_id,
            student_id: userId,
            test_id: originalFeedback.test_id,
            message,
            created_by: userId,
            sender_role: "Student"
          },
          include: {
            creator: {
              select: {
                name: true
              }
            }
          }
        });
  
        // Create notification
        await prisma.notifications.create({
          data: {
            user_id: originalFeedback.created_by,
            title: "💬 Student Replied to Your Feedback",
            message: `${reply.creator.name} replied to your feedback on ${originalFeedback.test.test_name}`,
            is_read: false,
          }
        });

        // 🔥 FIREBASE FCM: Notify original sender
        const originalSender = await prisma.users.findUnique({
          where: { user_id: originalFeedback.created_by },
          select: { push_token: true }
        });

        if (originalSender?.push_token) {
          await sendPushNotification({
            token: originalSender.push_token,
            title: "💬 Student Reply",
            body: `${reply.creator.name} replied to your feedback on ${originalFeedback.test.test_name}`,
            data: {
              type: "feedback_reply",
              feedback_id: reply.feedback_id.toString(),
              original_feedback_id: feedback_id.toString(),
              test_id: originalFeedback.test_id.toString(),
            },
          });
        }
  
        // Audit log
        await prisma.audit_log.create({
          data: {
            user_id: userId,
            action: "REPLY_FEEDBACK",
            entity_type: "feedback",
            entity_id: reply.feedback_id,
            remarks: `Student replied to feedback ${feedback_id}`
          }
        });
  
        res.status(201).json({
          success: true,
          message: "Reply sent successfully",
          data: reply
        });
        return;
      }
  
      // =====================
      // TEACHER REPLY
      // =====================
      if (userRole === "Teacher") {
        if (originalFeedback.test.created_by !== userId) {
          res.status(403).json({ error: "You can only reply to feedbacks on your own tests" });
          return;
        }
  
        const reply = await prisma.feedback.create({
          data: {
            teacher_id: originalFeedback.teacher_id,
            student_id: originalFeedback.student_id,
            test_id: originalFeedback.test_id,
            message,
            created_by: userId,
            sender_role: "Teacher"
          },
          include: {
            creator: {
              select: {
                name: true
              }
            }
          }
        });
  
        // Notify student
        await prisma.notifications.create({
          data: {
            user_id: originalFeedback.student_id,
            title: "💬 Teacher Replied to Feedback",
            message: `${reply.creator.name} replied to your feedback on ${originalFeedback.test.test_name}`,
            is_read: false,
          }
        });

        // 🔥 FIREBASE FCM: Notify student
        const student = await prisma.users.findUnique({
          where: { user_id: originalFeedback.student_id },
          select: { push_token: true }
        });

        if (student?.push_token) {
          await sendPushNotification({
            token: student.push_token,
            title: "💬 Teacher Reply",
            body: `${reply.creator.name} replied to your feedback on ${originalFeedback.test.test_name}`,
            data: {
              type: "feedback_reply",
              feedback_id: reply.feedback_id.toString(),
              test_id: originalFeedback.test_id.toString(),
            },
          });
        }
  
        // If replying to student's reply, notify the student again
        if (originalFeedback.sender_role === "Student" && originalFeedback.created_by !== userId) {
          await prisma.notifications.create({
            data: {
              user_id: originalFeedback.created_by,
              title: "💬 Teacher Responded",
              message: `${reply.creator.name} responded to your reply`,
              is_read: false,
            }
          });

          const replyingStudent = await prisma.users.findUnique({
            where: { user_id: originalFeedback.created_by },
            select: { push_token: true }
          });

          if (replyingStudent?.push_token) {
            await sendPushNotification({
              token: replyingStudent.push_token,
              title: "💬 Teacher Response",
              body: `${reply.creator.name} responded to your reply`,
              data: {
                type: "feedback_reply",
                feedback_id: reply.feedback_id.toString(),
              },
            });
          }
        }
  
        // Audit log
        await prisma.audit_log.create({
          data: {
            user_id: userId,
            action: "REPLY_FEEDBACK",
            entity_type: "feedback",
            entity_id: reply.feedback_id,
            remarks: `Teacher replied to feedback ${feedback_id}`
          }
        });
  
        res.status(201).json({
          success: true,
          message: "Reply sent successfully",
          data: reply
        });
        return;
      }
  
      // =====================
      // ADMIN REPLY
      // =====================
      if (userRole === "Admin") {
        const reply = await prisma.feedback.create({
          data: {
            teacher_id: originalFeedback.teacher_id,
            student_id: originalFeedback.student_id,
            test_id: originalFeedback.test_id,
            message,
            created_by: userId,
            sender_role: "Admin"
          },
          include: {
            creator: {
              select: {
                name: true
              }
            }
          }
        });
  
        // Notify student
        await prisma.notifications.create({
          data: {
            user_id: originalFeedback.student_id,
            title: "👔 Admin Replied to Feedback",
            message: `Admin replied to feedback on ${originalFeedback.test.test_name}`,
            is_read: false,
          }
        });

        // 🔥 FIREBASE FCM: Notify student
        const student = await prisma.users.findUnique({
          where: { user_id: originalFeedback.student_id },
          select: { push_token: true }
        });

        if (student?.push_token) {
          await sendPushNotification({
            token: student.push_token,
            title: "👔 Admin Reply",
            body: `Admin replied to feedback on ${originalFeedback.test.test_name}`,
            data: {
              type: "feedback_reply",
              feedback_id: reply.feedback_id.toString(),
              sender_role: "Admin",
            },
          });
        }
  
        // Notify teacher
        await prisma.notifications.create({
          data: {
            user_id: originalFeedback.test.created_by,
            title: "👔 Admin Replied to Feedback",
            message: `Admin replied to feedback on ${originalFeedback.test.test_name}`,
            is_read: false,
          }
        });

        const teacher = await prisma.users.findUnique({
          where: { user_id: originalFeedback.test.created_by },
          select: { push_token: true }
        });

        if (teacher?.push_token) {
          await sendPushNotification({
            token: teacher.push_token,
            title: "👔 Admin Reply",
            body: `Admin replied to feedback on ${originalFeedback.test.test_name}`,
            data: {
              type: "feedback_reply",
              feedback_id: reply.feedback_id.toString(),
            },
          });
        }
  
        // If replying to someone else's feedback, notify them too
        if (originalFeedback.created_by !== userId) {
          await prisma.notifications.create({
            data: {
              user_id: originalFeedback.created_by,
              title: "👔 Admin Responded",
              message: `Admin responded to your feedback`,
              is_read: false,
            }
          });

          const originalCreator = await prisma.users.findUnique({
            where: { user_id: originalFeedback.created_by },
            select: { push_token: true }
          });

          if (originalCreator?.push_token) {
            await sendPushNotification({
              token: originalCreator.push_token,
              title: "👔 Admin Response",
              body: `Admin responded to your feedback`,
              data: {
                type: "feedback_reply",
                feedback_id: reply.feedback_id.toString(),
              },
            });
          }
        }
  
        // Audit log
        await prisma.audit_log.create({
          data: {
            user_id: userId,
            action: "REPLY_FEEDBACK",
            entity_type: "feedback",
            entity_id: reply.feedback_id,
            remarks: `Admin replied to feedback ${feedback_id}`
          }
        });
  
        res.status(201).json({
          success: true,
          message: "Reply sent successfully",
          data: reply
        });
        return;
      }
  
      res.status(403).json({ error: "Invalid role" });
    } catch (error) {
      console.error("Error replying to feedback:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // 5️⃣ Get All Feedbacks (Universal - Role-based)
  getAllFeedbacks: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      console.log(userRole, "role hai bhai");

      if (!userId || !userRole) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // =====================
      // STUDENT RESPONSE
      // =====================
      if (userRole === "Student") {
        const approvedMarks = await prisma.marks.findMany({
          where: {
            student_id: userId,
            status: "Approved"
          },
          include: {
            test: {
              select: {
                test_id: true,
                test_name: true,
                max_marks: true,
                date_conducted: true,
                subject: {
                  select: {
                    subject_name: true
                  }
                },
                teacher_profile: {
                  include: {
                    users: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const allFeedbacks = [];

        for (const mark of approvedMarks) {
          const feedbacks = await prisma.feedback.findMany({
            where: {
              test_id: mark.test_id,
              student_id: userId
            },
            include: {
              creator: {
                select: {
                  name: true,
                  profile_picture: true
                }
              }
            },
            orderBy: { created_at: "desc" }
          });

          if (feedbacks.length > 0) {
            const percentage = (mark.marks_obtained / mark.test.max_marks) * 100;
            
            allFeedbacks.push({
              test_id: mark.test_id,
              test_name: mark.test.test_name,
              subject_name: mark.test.subject.subject_name,
              teacher_name: mark.test.teacher_profile.users.name,
              date_conducted: mark.test.date_conducted.toISOString().split('T')[0],
              marks_obtained: mark.marks_obtained,
              max_marks: mark.test.max_marks,
              percentage: parseFloat(percentage.toFixed(2)),
              feedbacks: feedbacks.map(fb => ({
                feedback_id: fb.feedback_id,
                sender_role: fb.sender_role,
                sender_name: fb.creator.name,
                message: fb.message,
                created_at: fb.created_at,
                is_my_reply: fb.sender_role === "Student"
              })),
              total_feedbacks: feedbacks.length
            });
          }
        }

        res.status(200).json({
          success: true,
          role: "Student",
          data: allFeedbacks,
          total_tests_with_feedback: allFeedbacks.length
        });
        return;
      }

      // =====================
      // TEACHER RESPONSE
      // =====================
      if (userRole === "Teacher") {
        const teacherTests = await prisma.test.findMany({
          where: {
            created_by: userId
          },
          select: {
            test_id: true,
            test_name: true,
            max_marks: true,
            date_conducted: true,
            subject: {
              select: {
                subject_name: true
              }
            },
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
        });

        const allFeedbacks = [];

        for (const test of teacherTests) {
          const feedbacks = await prisma.feedback.findMany({
            where: {
              test_id: test.test_id
            },
            include: {
              creator: {
                select: {
                  name: true,
                  profile_picture: true
                }
              },
              student_profile: {
                include: {
                  users: {
                    select: {
                      name: true,
                      profile_picture: true
                    }
                  }
                }
              }
            },
            orderBy: { created_at: "desc" }
          });

          if (feedbacks.length > 0) {
            const studentFeedbackMap: any = {};

            for (const fb of feedbacks) {
              const studentId = fb.student_id;
              if (!studentFeedbackMap[studentId]) {
                studentFeedbackMap[studentId] = {
                  student_id: studentId,
                  student_name: fb.student_profile.users.name,
                  student_profile_picture: fb.student_profile.users.profile_picture,
                  roll_number: fb.student_profile.roll_number,
                  feedbacks: []
                };
              }
              studentFeedbackMap[studentId].feedbacks.push({
                feedback_id: fb.feedback_id,
                sender_role: fb.sender_role,
                sender_name: fb.creator.name,
                message: fb.message,
                created_at: fb.created_at
              });
            }

            allFeedbacks.push({
              test_id: test.test_id,
              test_name: test.test_name,
              subject_name: test.subject.subject_name,
              class_name: test.Renamedclass.class_name,
              section_name: test.section.section_name,
              date_conducted: test.date_conducted.toISOString().split('T')[0],
              max_marks: test.max_marks,
              students: Object.values(studentFeedbackMap).map((student: any) => ({
                ...student,
                total_feedbacks: student.feedbacks.length
              })),
              total_students_with_feedback: Object.keys(studentFeedbackMap).length,
              total_feedbacks: feedbacks.length
            });
          }
        }

        res.status(200).json({
          success: true,
          role: "Teacher",
          data: allFeedbacks,
          total_tests_with_feedback: allFeedbacks.length
        });
        return;
      }

      // =====================
      // ADMIN RESPONSE
      // =====================
      if (userRole === "Admin") {
        const allTests = await prisma.test.findMany({
          select: {
            test_id: true,
            test_name: true,
            max_marks: true,
            date_conducted: true,
            subject: {
              select: {
                subject_name: true
              }
            },
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
            teacher_profile: {
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

        const allFeedbacks = [];

        for (const test of allTests) {
          const feedbacks = await prisma.feedback.findMany({
            where: {
              test_id: test.test_id
            },
            include: {
              creator: {
                select: {
                  name: true,
                  profile_picture: true
                }
              },
              student_profile: {
                include: {
                  users: {
                    select: {
                      name: true,
                      profile_picture: true
                    }
                  }
                }
              }
            },
            orderBy: { created_at: "desc" }
          });

          if (feedbacks.length > 0) {
            const studentFeedbackMap: any = {};

            for (const fb of feedbacks) {
              const studentId = fb.student_id;
              if (!studentFeedbackMap[studentId]) {
                studentFeedbackMap[studentId] = {
                  student_id: studentId,
                  student_name: fb.student_profile.users.name,
                  roll_number: fb.student_profile.roll_number,
                  feedbacks: []
                };
              }
              studentFeedbackMap[studentId].feedbacks.push({
                feedback_id: fb.feedback_id,
                sender_role: fb.sender_role,
                sender_name: fb.creator.name,
                message: fb.message,
                created_at: fb.created_at
              });
            }

            const feedbackBreakdown = {
              system: feedbacks.filter(fb => fb.sender_role === "System").length,
              teacher: feedbacks.filter(fb => fb.sender_role === "Teacher").length,
              admin: feedbacks.filter(fb => fb.sender_role === "Admin").length,
              student: feedbacks.filter(fb => fb.sender_role === "Student").length
            };

            allFeedbacks.push({
              test_id: test.test_id,
              test_name: test.test_name,
              subject_name: test.subject.subject_name,
              teacher_name: test.teacher_profile.users.name,
              class_name: test.Renamedclass.class_name,
              section_name: test.section.section_name,
              date_conducted: test.date_conducted.toISOString().split('T')[0],
              max_marks: test.max_marks,
              students: Object.values(studentFeedbackMap).map((student: any) => ({
                ...student,
                total_feedbacks: student.feedbacks.length
              })),
              feedback_breakdown: feedbackBreakdown,
              total_students_with_feedback: Object.keys(studentFeedbackMap).length,
              total_feedbacks: feedbacks.length
            });
          }
        }

        console.log(allFeedbacks, "all feedbacks data");

        res.status(200).json({
          success: true,
          role: "Admin",
          data: allFeedbacks,
          total_tests_with_feedback: allFeedbacks.length
        });
        return;
      }

      res.status(403).json({ error: "Invalid role" });
    } catch (error) {
      console.error("Error getting all feedbacks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
