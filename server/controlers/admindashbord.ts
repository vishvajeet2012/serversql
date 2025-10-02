import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";

export const getAdminAnalytics = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== "Admin") {
      res.status(403).json({ error: "Access denied. Admin only." });
      return;
    }

    // Date calculations
    const currentDate = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // 1. OVERALL SYSTEM STATISTICS
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSections,
      totalSubjects,
      totalTests,
      activeStudents,
      activeTeachers,
    ] = await Promise.all([
      prisma.student_profile.count(),
      prisma.teacher_profile.count(),
      prisma.renamedclass.count(),
      prisma.section.count(),
      prisma.subject.count(),
      prisma.test.count(),
      prisma.users.count({
        where: { role: "Student", status: "Active" },
      }),
      prisma.users.count({
        where: { role: "Teacher", status: "Active" },
      }),
    ]);

    // 2. ENROLLMENT TRENDS (Last 6 months)
    const enrollmentData = await prisma.users.groupBy({
      by: ["created_at"],
      where: {
        role: "Student",
        created_at: {
          gte: sixMonthsAgo,
        },
      },
      _count: {
        user_id: true,
      },
    });

    const enrollmentByMonth = new Map<string, number>();
    enrollmentData.forEach((item) => {
      if (item.created_at) {
        const date = new Date(item.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const existing = enrollmentByMonth.get(monthYear) || 0;
        enrollmentByMonth.set(monthYear, existing + item._count.user_id);
      }
    });

    const enrollmentTrend = Array.from(enrollmentByMonth.entries())
      .map(([month, count]) => ({ month, student_count: count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 3. CLASS-WISE PERFORMANCE
    const classPerformance = await prisma.renamedclass.findMany({
      select: {
        class_id: true,
        class_name: true,
        _count: {
          select: {
            student_profile: true,
            test: true,
          },
        },
      },
    });

    const classPerformanceData = await Promise.all(
      classPerformance.map(async (cls) => {
        // Get all approved marks for students in this class
        const approvedMarks = await prisma.marks.findMany({
          where: {
            status: "Approved",
            student_profile: {
              class_id: cls.class_id,
            },
            test: {
              date_conducted: {
                gte: sixMonthsAgo,
              },
            },
          },
          include: {
            test: {
              select: {
                max_marks: true,
              },
            },
          },
        });

        const totalMarksObtained = approvedMarks.reduce(
          (sum, mark) => sum + mark.marks_obtained,
          0
        );
        const totalMaxMarks = approvedMarks.reduce(
          (sum, mark) => sum + mark.test.max_marks,
          0
        );

        const averagePercentage =
          totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2) : "0";

        return {
          class_id: cls.class_id,
          class_name: cls.class_name,
          total_students: cls._count.student_profile,
          total_tests: cls._count.test,
          average_percentage: parseFloat(averagePercentage),
          total_marks_obtained: totalMarksObtained,
          total_max_marks: totalMaxMarks,
        };
      })
    );

    // 4. SUBJECT-WISE PERFORMANCE (System-wide)
    const subjects = await prisma.subject.findMany({
      select: {
        subject_id: true,
        subject_name: true,
      },
    });

    const subjectPerformanceData = await Promise.all(
      subjects.map(async (subject) => {
        const approvedMarks = await prisma.marks.findMany({
          where: {
            status: "Approved",
            test: {
              subject_id: subject.subject_id,
              date_conducted: {
                gte: sixMonthsAgo,
              },
            },
          },
          include: {
            test: {
              select: {
                max_marks: true,
              },
            },
          },
        });

        const totalMarksObtained = approvedMarks.reduce(
          (sum, mark) => sum + mark.marks_obtained,
          0
        );
        const totalMaxMarks = approvedMarks.reduce(
          (sum, mark) => sum + mark.test.max_marks,
          0
        );

        const averagePercentage =
          totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2) : "0";

        return {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          test_count: approvedMarks.length,
          average_percentage: parseFloat(averagePercentage),
          total_students_attempted: new Set(approvedMarks.map((m) => m.student_id)).size,
        };
      })
    );

    // 5. TEACHER PERFORMANCE METRICS
    const teacherPerformance = await prisma.teacher_profile.findMany({
      include: {
        users: {
          select: {
            name: true,
            email: true,
          },
        },
        test: {
          where: {
            date_conducted: {
              gte: sixMonthsAgo,
            },
          },
          select: {
            test_id: true,
          },
        },
        feedback: {
          where: {
            created_at: {
              gte: sixMonthsAgo,
            },
          },
          select: {
            feedback_id: true,
          },
        },
        section_teachers: {
          select: {
            section_id: true,
          },
        },
      },
    });

    const teacherPerformanceData = teacherPerformance.map((teacher) => ({
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.users.name,
      teacher_email: teacher.users.email,
      tests_created: teacher.test.length,
      feedback_given: teacher.feedback.length,
      sections_assigned: teacher.section_teachers.length,
    }));

    // 6. TEST COMPLETION RATES (System-wide)
    const allTests = await prisma.test.findMany({
      where: {
        date_conducted: {
          gte: sixMonthsAgo,
          lte: currentDate,
        },
      },
      select: {
        test_id: true,
        class_id: true,
      },
    });

    const testCompletionData = await Promise.all(
      allTests.map(async (test) => {
        const studentsInClass = await prisma.student_profile.count({
          where: { class_id: test.class_id },
        });

        const studentsCompleted = await prisma.marks.count({
          where: {
            test_id: test.test_id,
            status: "Approved",
          },
        });

        return {
          total_students: studentsInClass,
          completed: studentsCompleted,
        };
      })
    );

    const totalStudentsExpected = testCompletionData.reduce(
      (sum, data) => sum + data.total_students,
      0
    );
    const totalCompleted = testCompletionData.reduce((sum, data) => sum + data.completed, 0);
    const completionRate =
      totalStudentsExpected > 0
        ? ((totalCompleted / totalStudentsExpected) * 100).toFixed(2)
        : "0";

    // 7. TOP PERFORMING STUDENTS (Top 10)
    const topStudents = await prisma.student_profile.findMany({
      take: 100,
      include: {
        users: {
          select: {
            name: true,
            email: true,
          },
        },
        Renamedclass: {
          select: {
            class_name: true,
          },
        },
        section: {
          select: {
            section_name: true,
          },
        },
        marks: {
          where: {
            status: "Approved",
            test: {
              date_conducted: {
                gte: sixMonthsAgo,
              },
            },
          },
          include: {
            test: {
              select: {
                max_marks: true,
              },
            },
          },
        },
      },
    });

    const studentsWithPerformance = topStudents
      .map((student) => {
        const totalMarksObtained = student.marks.reduce(
          (sum, mark) => sum + mark.marks_obtained,
          0
        );
        const totalMaxMarks = student.marks.reduce((sum, mark) => sum + mark.test.max_marks, 0);
        const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

        return {
          student_id: student.student_id,
          student_name: student.users.name,
          roll_number: student.roll_number,
          class: student.Renamedclass.class_name,
          section: student.section.section_name,
          total_tests: student.marks.length,
          average_percentage: parseFloat(percentage.toFixed(2)),
        };
      })
      .filter((s) => s.total_tests > 0)
      .sort((a, b) => b.average_percentage - a.average_percentage)
      .slice(0, 10);

    // 8. MONTHLY TEST TREND (System-wide)
    const monthlyTests = await prisma.test.groupBy({
      by: ["date_conducted"],
      where: {
        date_conducted: {
          gte: sixMonthsAgo,
        },
      },
      _count: {
        test_id: true,
      },
    });

    const testsByMonth = new Map<string, number>();
    monthlyTests.forEach((item) => {
      const date = new Date(item.date_conducted);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = testsByMonth.get(monthYear) || 0;
      testsByMonth.set(monthYear, existing + item._count.test_id);
    });

    const monthlyTestTrend = Array.from(testsByMonth.entries())
      .map(([month, count]) => ({ month, test_count: count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 9. GRADE DISTRIBUTION (System-wide)
    const allApprovedMarks = await prisma.marks.findMany({
      where: {
        status: "Approved",
        test: {
          date_conducted: {
            gte: sixMonthsAgo,
          },
        },
      },
      include: {
        test: {
          select: {
            max_marks: true,
          },
        },
      },
    });

    const gradeDistribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    allApprovedMarks.forEach((mark) => {
      const percentage = (mark.marks_obtained / mark.test.max_marks) * 100;
      if (percentage >= 90) gradeDistribution.A++;
      else if (percentage >= 80) gradeDistribution.B++;
      else if (percentage >= 70) gradeDistribution.C++;
      else if (percentage >= 60) gradeDistribution.D++;
      else gradeDistribution.F++;
    });

    const gradeDistributionData = [
      { grade: "A (90-100%)", count: gradeDistribution.A, color: "#4CAF50" },
      { grade: "B (80-89%)", count: gradeDistribution.B, color: "#8BC34A" },
      { grade: "C (70-79%)", count: gradeDistribution.C, color: "#FFC107" },
      { grade: "D (60-69%)", count: gradeDistribution.D, color: "#FF9800" },
      { grade: "F (<60%)", count: gradeDistribution.F, color: "#F44336" },
    ];

    // 10. RECENT ACTIVITIES (Last 30 days)
    const recentTests = await prisma.test.count({
      where: {
        created_at: {
          gte: oneMonthAgo,
        },
      },
    });

    const recentFeedback = await prisma.feedback.count({
      where: {
        created_at: {
          gte: oneMonthAgo,
        },
      },
    });

    const recentMarksApproved = await prisma.marks.count({
      where: {
        approved_at: {
          gte: oneMonthAgo,
        },
        status: "Approved",
      },
    });

    const recentEnrollments = await prisma.student_profile.count({
      where: {
        created_at: {
          gte: oneMonthAgo,
        },
      },
    });

    // 11. PENDING APPROVALS
    const pendingMarksApproval = await prisma.marks.count({
      where: {
        status: "PendingApproval",
      },
    });

    const pendingTestsByClass = await prisma.renamedclass.findMany({
      select: {
        class_id: true,
        class_name: true,
        test: {
          where: {
            date_conducted: {
              lte: currentDate,
            },
          },
          select: {
            test_id: true,
            marks: {
              where: {
                status: "PendingApproval",
              },
              select: {
                marks_id: true,
              },
            },
          },
        },
      },
    });

    const pendingByClass = pendingTestsByClass.map((cls) => ({
      class_name: cls.class_name,
      pending_count: cls.test.reduce((sum, test) => sum + test.marks.length, 0),
    }));

    // 12. ATTENDANCE/PARTICIPATION RATE
    const studentsWithTests = await prisma.student_profile.count({
      where: {
        marks: {
          some: {
            status: "Approved",
            test: {
              date_conducted: {
                gte: oneMonthAgo,
              },
            },
          },
        },
      },
    });

    const participationRate =
      totalStudents > 0 ? ((studentsWithTests / totalStudents) * 100).toFixed(2) : "0";

    // Prepare response
    const analyticsData = {
      overall_statistics: {
        total_students: totalStudents,
        active_students: activeStudents,
        total_teachers: totalTeachers,
        active_teachers: activeTeachers,
        total_classes: totalClasses,
        total_sections: totalSections,
        total_subjects: totalSubjects,
        total_tests: totalTests,
        test_completion_rate: parseFloat(completionRate),
        student_participation_rate: parseFloat(participationRate),
      },
      enrollment_trend: enrollmentTrend,
      class_performance: classPerformanceData.sort(
        (a, b) => b.average_percentage - a.average_percentage
      ),
      subject_performance: subjectPerformanceData.sort(
        (a, b) => b.average_percentage - a.average_percentage
      ),
      teacher_performance: teacherPerformanceData.sort((a, b) => b.tests_created - a.tests_created),
      top_students: studentsWithPerformance,
      monthly_test_trend: monthlyTestTrend,
      grade_distribution: gradeDistributionData,
      recent_activities: {
        tests_created: recentTests,
        feedback_given: recentFeedback,
        marks_approved: recentMarksApproved,
        new_enrollments: recentEnrollments,
      },
      pending_actions: {
        marks_pending_approval: pendingMarksApproval,
        pending_by_class: pendingByClass.filter((c) => c.pending_count > 0),
      },
    };

    res.status(200).json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
