// controllers/studentDashboardController.ts
import { Response, NextFunction } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";

// export const getStudentDashboard = async (
//   req: RequestWithUser,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?.userId;

//     if (!userId) {
//       res.status(401).json({ error: "Unauthorized: User not found" });
//       return;
//     }

//     // Get student profile
//     const studentProfile = await prisma.student_profile.findUnique({
//       where: { student_id: userId },
//       include: {
//         Renamedclass: true,
//         section: true,
//       },
//     });

//     if (!studentProfile) {
//       res.status(404).json({ error: "Student profile not found" });
//       return;
//     }

//     const currentDate = new Date();
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(currentDate.getDate() - 30);

//     // Get ongoing tests (conducted in last 30 days)
//     const ongoingTests = await prisma.test.findMany({
//       where: {
//         class_id: studentProfile.class_id,
//         section_id: studentProfile.section_id,
//         date_conducted: {
//           gte: thirtyDaysAgo,
//           lte: currentDate,
//         },
//       },
//       include: {
//         subject: {
//           select: {
//             subject_name: true,
//           },
//         },
//         marks: {
//           where: {
//             student_id: userId,
//           },
//           select: {
//             marks_obtained: true,
//             status: true,
//           },
//         },
//       },
//       orderBy: {
//         date_conducted: "desc",
//       },
//     });

//     // Get upcoming tests (scheduled in next 60 days)
//     const sixtyDaysFromNow = new Date();
//     sixtyDaysFromNow.setDate(currentDate.getDate() + 60);

//     const upcomingTests = await prisma.test.findMany({
//       where: {
//         class_id: studentProfile.class_id,
//         section_id: studentProfile.section_id,
//         date_conducted: {
//           gt: currentDate,
//           lte: sixtyDaysFromNow,
//         },
//       },
//       include: {
//         subject: {
//           select: {
//             subject_name: true,
//           },
//         },
//       },
//       orderBy: {
//         date_conducted: "asc",
//       },
//     });

//     // Format the response
//     const dashboardData = {
//       student: {
//         name: req.user?.email,
//         roll_number: studentProfile.roll_number,
//         class: studentProfile.Renamedclass.class_name,
//         section: studentProfile.section.section_name,
//       },
//       ongoing_tests: ongoingTests.map((test) => ({
//         test_id: test.test_id,
//         test_name: test.test_name,
//         subject: test.subject.subject_name,
//         date_conducted: test.date_conducted,
//         max_marks: test.max_marks,
//         marks_obtained: test.marks[0]?.marks_obtained || null,
//         status: test.marks[0]?.status || "Not Submitted",
//       })),
//       upcoming_tests: upcomingTests.map((test) => ({
//         test_id: test.test_id,
//         test_name: test.test_name,
//         subject: test.subject.subject_name,
//         date_conducted: test.date_conducted,
//         max_marks: test.max_marks,
//       })),
//       summary: {
//         total_ongoing: ongoingTests.length,
//         total_upcoming: upcomingTests.length,
//         completed: ongoingTests.filter((test) => test.marks.length > 0).length,
//         pending: ongoingTests.filter((test) => test.marks.length === 0).length,
//       },
//     };

//     res.status(200).json({
//       success: true,
//       data: dashboardData,
//     });
//   } catch (error) {
//     console.error("Error fetching student dashboard:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };





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

    // Get student profile with class, section, and user details
    const studentProfile = await prisma.student_profile.findUnique({
      where: { student_id: userId },
      include: {
        Renamedclass: true,
        section: true,
        users: {
          select: {
            name: true,
            email: true,
            profile_picture: true,
          },
        },
      },
    });

    if (!studentProfile) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    // Date calculations - using immutable date objects
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get all tests from last 30 days (past tests only)
    const allTestsLast30Days = await prisma.test.findMany({
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
        teacher_profile: {
          include: {
            users: {
              select: {
                name: true,
                email: true,
                profile_picture: true,
              },
            },
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
        feedback: {
          where: {
            student_id: userId,
          },
          include: {
            teacher_profile: {
              include: {
                users: {
                  select: {
                    name: true,
                    email: true,
                    profile_picture: true,
                  },
                },
              },
            },
            student_profile: {
              include: {
                users: {
                  select: {
                    name: true,
                    email: true,
                    profile_picture: true,
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
      orderBy: {
        date_conducted: "desc",
      },
    });

    // Filter: Completed tests = marks exist AND status is "Approved"
    const completedTests = allTestsLast30Days.filter(
      (test) => test.marks.length > 0 && test.marks[0]?.status === "Approved"
    );

    // Filter: Pending tests = No marks OR status is NOT "Approved"
    const pendingTests = allTestsLast30Days.filter(
      (test) =>
        test.marks.length === 0 ||
        (test.marks.length > 0 && test.marks[0]?.status !== "Approved")
    );

    // Get upcoming tests (future dates)
    const sixtyDaysFromNow = new Date(now);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    sixtyDaysFromNow.setHours(23, 59, 59, 999);

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
        teacher_profile: {
          include: {
            users: {
              select: {
                name: true,
                email: true,
                profile_picture: true,
              },
            },
          },
        },
      },
      orderBy: {
        date_conducted: "asc",
      },
    });

    // Format the response with proper null safety
    const dashboardData = {
      student: {
        name: studentProfile.users.name,
        email: studentProfile.users.email,
        profile_picture: studentProfile.users.profile_picture ?? null,
        roll_number: studentProfile.roll_number,
        class: studentProfile.Renamedclass.class_name,
        section: studentProfile.section.section_name,
      },
      completed_tests: completedTests.map((test) => ({
        test_id: test.test_id,
        test_name: test.test_name,
        subject: test.subject.subject_name,
        date_conducted: test.date_conducted,
        max_marks: test.max_marks,
        marks_obtained: test.marks[0]?.marks_obtained ?? 0,
        status: test.marks[0]?.status ?? "Unknown",
        test_rank: test.test_rank,
        teacher: {
          name: test.teacher_profile.users.name,
          email: test.teacher_profile.users.email,
          profile_picture: test.teacher_profile.users.profile_picture ?? null,
        },
        feedback: test.feedback.map((fb) => ({
          feedback_id: fb.feedback_id,
          message: fb.message,
          created_at: fb.created_at,
          updated_at: fb.updated_at,
          teacher: {
            name: fb.teacher_profile.users.name,
            email: fb.teacher_profile.users.email,
            profile_picture: fb.teacher_profile.users.profile_picture ?? null,
          },
          student: {
            name: fb.student_profile.users.name,
            email: fb.student_profile.users.email,
            profile_picture: fb.student_profile.users.profile_picture ?? null,
          },
        })),
      })),
      pending_tests: pendingTests.map((test) => ({
        test_id: test.test_id,
        test_name: test.test_name,
        subject: test.subject.subject_name,
        date_conducted: test.date_conducted,
        max_marks: test.max_marks,
        marks_obtained: test.marks[0]?.marks_obtained ?? null,
        status: test.marks[0]?.status ?? "Not Submitted",
        test_rank: test.test_rank,
        teacher: {
          name: test.teacher_profile.users.name,
          email: test.teacher_profile.users.email,
          profile_picture: test.teacher_profile.users.profile_picture ?? null,
        },
      })),
      upcoming_tests: upcomingTests.map((test) => ({
        test_id: test.test_id,
        test_name: test.test_name,
        subject: test.subject.subject_name,
        date_conducted: test.date_conducted,
        max_marks: test.max_marks,
        test_rank: test.test_rank,
        teacher: {
          name: test.teacher_profile.users.name,
          email: test.teacher_profile.users.email,
          profile_picture: test.teacher_profile.users.profile_picture ?? null,
        },
      })),
      summary: {
        total_completed: completedTests.length,
        total_pending: pendingTests.length,
        total_upcoming: upcomingTests.length,
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




export const getStudentAnalytics = async (
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
      select: {
        class_id: true,
        section_id: true,
      },
    });

    if (!studentProfile) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    // Date calculations for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // 1. Get all approved tests with marks for the student
    const studentTests = await prisma.marks.findMany({
      where: {
        student_id: userId,
        status: "Approved",
        test: {
          date_conducted: {
            gte: sixMonthsAgo,
          },
        },
      },
      include: {
        test: {
          include: {
            subject: {
              select: {
                subject_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        test: {
          date_conducted: "asc",
        },
      },
    });

    // 2. Subject-wise Performance (Average marks by subject)
    const subjectPerformance: {
      [key: string]: { total: number; count: number; maxMarks: number };
    } = {};

    studentTests.forEach((mark) => {
      const subjectName = mark.test.subject.subject_name;
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = {
          total: 0,
          count: 0,
          maxMarks: 0,
        };
      }
      subjectPerformance[subjectName].total += mark.marks_obtained;
      subjectPerformance[subjectName].count += 1;
      subjectPerformance[subjectName].maxMarks += mark.test.max_marks;
    });

    const subjectWiseData = Object.entries(subjectPerformance).map(
      ([subject, data]) => ({
        subject,
        average_marks: Math.round((data.total / data.count) * 100) / 100,
        total_tests: data.count,
        average_percentage:
          Math.round(((data.total / data.maxMarks) * 100) * 100) / 100,
      })
    );

    // 3. Performance Trend (Month-wise)
    const monthlyPerformance: {
      [key: string]: { total: number; count: number; maxMarks: number };
    } = {};

    studentTests.forEach((mark) => {
      const date = new Date(mark.test.date_conducted);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyPerformance[monthKey]) {
        monthlyPerformance[monthKey] = {
          total: 0,
          count: 0,
          maxMarks: 0,
        };
      }
      monthlyPerformance[monthKey].total += mark.marks_obtained;
      monthlyPerformance[monthKey].count += 1;
      monthlyPerformance[monthKey].maxMarks += mark.test.max_marks;
    });

    const performanceTrend = Object.entries(monthlyPerformance)
      .map(([month, data]) => ({
        month,
        average_marks: Math.round((data.total / data.count) * 100) / 100,
        total_tests: data.count,
        average_percentage:
          Math.round(((data.total / data.maxMarks) * 100) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 4. Overall Statistics
    const totalTests = studentTests.length;
    const totalMarksObtained = studentTests.reduce(
      (sum, mark) => sum + mark.marks_obtained,
      0
    );
    const totalMaxMarks = studentTests.reduce(
      (sum, mark) => sum + mark.test.max_marks,
      0
    );
    const overallPercentage =
      totalMaxMarks > 0
        ? Math.round((totalMarksObtained / totalMaxMarks) * 100 * 100) / 100
        : 0;

    // 5. Grade Distribution
    const gradeDistribution = {
      excellent: 0, // 90-100%
      good: 0, // 75-89%
      average: 0, // 60-74%
      below_average: 0, // 40-59%
      poor: 0, // 0-39%
    };

    studentTests.forEach((mark) => {
      const percentage = (mark.marks_obtained / mark.test.max_marks) * 100;
      if (percentage >= 90) gradeDistribution.excellent++;
      else if (percentage >= 75) gradeDistribution.good++;
      else if (percentage >= 60) gradeDistribution.average++;
      else if (percentage >= 40) gradeDistribution.below_average++;
      else gradeDistribution.poor++;
    });

    // 6. Class Average Comparison
    const classAverages = await Promise.all(
      subjectWiseData.map(async (subjectData) => {
        // Get all tests for this subject in student's class
        const classTests = await prisma.test.findMany({
          where: {
            class_id: studentProfile.class_id,
            section_id: studentProfile.section_id,
            subject: {
              subject_name: subjectData.subject,
            },
            date_conducted: {
              gte: sixMonthsAgo,
            },
          },
          select: {
            test_id: true,
            max_marks: true,
          },
        });

        const testIds = classTests.map((t) => t.test_id);

        // Get all approved marks for these tests
        const allMarks = await prisma.marks.aggregate({
          where: {
            test_id: {
              in: testIds,
            },
            status: "Approved",
          },
          _avg: {
            marks_obtained: true,
          },
          _count: {
            marks_id: true,
          },
        });

        return {
          subject: subjectData.subject,
          student_average: subjectData.average_marks,
          class_average:
            Math.round((allMarks._avg.marks_obtained ?? 0) * 100) / 100,
          total_students: allMarks._count.marks_id,
        };
      })
    );

    // 7. Recent Test Scores (Last 10 tests)
    const recentTests = studentTests.slice(-10).map((mark) => ({
      test_name: mark.test.test_name,
      subject: mark.test.subject.subject_name,
      marks_obtained: mark.marks_obtained,
      max_marks: mark.test.max_marks,
      percentage:
        Math.round((mark.marks_obtained / mark.test.max_marks) * 100 * 100) /
        100,
      date: mark.test.date_conducted,
    }));

    // 8. Test Completion Rate
    const totalTestsInClass = await prisma.test.count({
      where: {
        class_id: studentProfile.class_id,
        section_id: studentProfile.section_id,
        date_conducted: {
          gte: sixMonthsAgo,
          lte: now,
        },
      },
    });

    const completedTests = await prisma.marks.count({
      where: {
        student_id: userId,
        status: "Approved",
        test: {
          date_conducted: {
            gte: sixMonthsAgo,
            lte: now,
          },
        },
      },
    });

    const pendingTests = totalTestsInClass - completedTests;
    const completionRate =
      totalTestsInClass > 0
        ? Math.round((completedTests / totalTestsInClass) * 100 * 100) / 100
        : 0;

    // Response
    const analyticsData = {
      overview: {
        total_tests: totalTests,
        total_marks_obtained: totalMarksObtained,
        total_max_marks: totalMaxMarks,
        overall_percentage: overallPercentage,
        completion_rate: completionRate,
        completed_tests: completedTests,
        pending_tests: pendingTests,
      },
      subject_wise_performance: subjectWiseData,
      performance_trend: performanceTrend,
      grade_distribution: gradeDistribution,
      class_comparison: classAverages,
      recent_tests: recentTests,
    };

    res.status(200).json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
