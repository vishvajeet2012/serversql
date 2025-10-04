// controllers/feedbackController.ts
import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";
import { io } from "../server";

export const feedbackController = {
  // Admin creates manual feedback
  createAdminFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { marks_id, message } = req.body;
      const adminId = req.user?.userId;

      if (!adminId || !marks_id || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const marks = await prisma.marks.findUnique({
        where: { marks_id: parseInt(marks_id) },
        include: {
          test: { select: { test_id: true, test_name: true, created_by: true } },
          student_profile: { include: { users: { select: { name: true } } } }
        }
      });

      if (!marks || marks.status !== "Approved") {
        res.status(400).json({ error: "Marks must be approved first" });
        return;
      }

      const feedback = await prisma.feedback.create({
        data: {
          teacher_id: marks.test.created_by,
          student_id: marks.student_id,
          test_id: marks.test_id,
          message,
          created_by: adminId,
          sender_role: "Admin"
        }
      });

      await prisma.notifications.create({
        data: {
          user_id: marks.student_id,
          title: "👔 Admin Feedback",
          message: `Admin gave you feedback on ${marks.test.test_name}`
        }
      });

      res.status(201).json({ success: true, data: feedback });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Teacher creates manual feedback
  createTeacherFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { test_id, student_id, message } = req.body;
      const teacherId = req.user?.userId;

      if (!teacherId || !test_id || !student_id || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const test = await prisma.test.findFirst({
        where: { test_id: parseInt(test_id), created_by: teacherId },
        select: { test_name: true }
      });

      if (!test) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const marks = await prisma.marks.findFirst({
        where: {
          test_id: parseInt(test_id),
          student_id: parseInt(student_id),
          status: "Approved"
        }
      });

      if (!marks) {
        res.status(400).json({ error: "Marks must be approved first" });
        return;
      }

      const feedback = await prisma.feedback.create({
        data: {
          teacher_id: teacherId,
          student_id: parseInt(student_id),
          test_id: parseInt(test_id),
          message,
          created_by: teacherId,
          sender_role: "Teacher"
        }
      });

      res.status(201).json({ success: true, data: feedback });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Teacher edits feedback
  editFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { feedback_id } = req.body;
      const { message } = req.body;
      const teacherId = req.user?.userId;

      if (!teacherId || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const feedback = await prisma.feedback.findUnique({
        where: { feedback_id: parseInt(feedback_id?? "0") }
      });

      if (!feedback) {
        res.status(404).json({ error: "Feedback not found" });
        return;
      }

      const canEdit =
        feedback.sender_role === "System" ||
        (feedback.sender_role === "Teacher" && feedback.created_by === teacherId);

      if (!canEdit) {
        res.status(403).json({ error: "Cannot edit this feedback" });
        return;
      }

      const updated = await prisma.feedback.update({
        where: { feedback_id: parseInt(feedback_id?? "0") },
        data: { message, updated_at: new Date() }
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Student replies to feedback
  replyToFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { original_feedback_id, message } = req.body;
      const studentId = req.user?.userId;

      if (!studentId || !original_feedback_id || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const originalFeedback = await prisma.feedback.findUnique({
        where: { feedback_id: parseInt(original_feedback_id) },
        include: {
          creator: { select: { user_id: true, name: true } },
          test: { select: { test_name: true, created_by: true } }
        }
      });

      if (!originalFeedback || originalFeedback.student_id !== studentId) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      const reply = await prisma.feedback.create({
        data: {
          teacher_id: originalFeedback.teacher_id,
          student_id: studentId,
          test_id: originalFeedback.test_id,
          message,
          created_by: studentId,
          sender_role: "Student"
        }
      });

      await prisma.notifications.create({
        data: {
          user_id: originalFeedback.created_by,
          title: "💬 Student Reply",
          message: `Student replied to your feedback`
        }
      });

      res.status(201).json({ success: true, data: reply });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get feedback thread
  getFeedbackThread: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { test_id, student_id } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (userRole === "Student" && userId !== parseInt(student_id??"0")) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      if (userRole === "Teacher") {
        const marks = await prisma.marks.findFirst({
          where: {
            test_id: parseInt(test_id?? "0"),
            student_id: parseInt(student_id?? "0"),
            status: "Approved"
          }
        });

        if (!marks) {
          res.status(403).json({ error: "Marks not approved yet" });
          return;
        }
      }

      const feedbacks = await prisma.feedback.findMany({
        where: {
          test_id: parseInt(test_id?? "0"),
          student_id: parseInt(student_id?? "0")
        },
        include: {
          creator: { select: { name: true, profile_picture: true, role: true } }
        },
        orderBy: { created_at: "asc" }
      });

      res.status(200).json({ success: true, data: feedbacks });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Student gets all feedback
  getMyFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const studentId = req.user?.userId;

      const feedbacks = await prisma.feedback.findMany({
        where: { student_id: studentId },
        include: {
          creator: { select: { name: true, profile_picture: true } },
          test: {
            select: {
              test_name: true,
              subject: { select: { subject_name: true } }
            }
          }
        },
        orderBy: { created_at: "desc" }
      });

      res.status(200).json({ success: true, data: feedbacks });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Teacher review feedback
  getTeacherReviewFeedback: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const teacherId = req.user?.userId;

      const feedbacks = await prisma.feedback.findMany({
        where: {
          test: { created_by: teacherId },
          sender_role: { in: ["System", "Teacher"] }
        },
        include: {
          student_profile: { include: { users: { select: { name: true } } } },
          test: { select: { test_name: true } }
        },
        orderBy: { created_at: "desc" }
      });

      res.status(200).json({ success: true, data: feedbacks });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
