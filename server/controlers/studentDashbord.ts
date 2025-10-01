// controllers/studentDashboardController.ts
import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";

export const getStudentDashboard = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    // Get student profile
    const studentProfile = await prisma.student_profile.findUnique({
      where: { student_id: userId },
      include: {
        Renamedclass: true,
        section: true,
      },
    });

    if (!studentProfile) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    // Get ongoing tests (conducted in last 30 days)
    const ongoingTests = await prisma.test.findMany({
      where: {
        class_id: studentProfile.class_id,
        section_id: studentProfile.section_id,
        date_conducted: {
          gte: thirtyDaysAgo,
          lte: currentDate,
        },
      },
      include: {
        subject: {
          select: {
            subject_name: true,
          },
        },
        marks: {
          where: {
            student_id: userId,
          },
          select: {
            marks_obtained: true,
            status: true,
          },
        },
      },
      orderBy: {
        date_conducted: "desc",
      },
    });

    // Get upcoming tests (scheduled in next 60 days)
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(currentDate.getDate() + 60);

    const upcomingTests = await prisma.test.findMany({
      where: {
        class_id: studentProfile.class_id,
        section_id: studentProfile.section_id,
        date_conducted: {
          gt: currentDate,
          lte: sixtyDaysFromNow,
        },
      },
      include: {
        subject: {
          select: {
            subject_name: true,
          },
        },
      },
      orderBy: {
        date_conducted: "asc",
      },
    });

    // Format the response
    const dashboardData = {
      student: {
        name: req.user?.email,
        roll_number: studentProfile.roll_number,
        class: studentProfile.Renamedclass.class_name,
        section: studentProfile.section.section_name,
      },
      ongoing_tests: ongoingTests.map((test) => ({
        test_id: test.test_id,
        test_name: test.test_name,
        subject: test.subject.subject_name,
        date_conducted: test.date_conducted,
        max_marks: test.max_marks,
        marks_obtained: test.marks[0]?.marks_obtained || null,
        status: test.marks[0]?.status || "Not Submitted",
      })),
      upcoming_tests: upcomingTests.map((test) => ({
        test_id: test.test_id,
        test_name: test.test_name,
        subject: test.subject.subject_name,
        date_conducted: test.date_conducted,
        max_marks: test.max_marks,
      })),
      summary: {
        total_ongoing: ongoingTests.length,
        total_upcoming: upcomingTests.length,
        completed: ongoingTests.filter((test) => test.marks.length > 0).length,
        pending: ongoingTests.filter((test) => test.marks.length === 0).length,
      },
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching student dashboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
