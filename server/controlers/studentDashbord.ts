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
