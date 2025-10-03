// import { Response } from 'express';
// import prisma from '../db/prisma';
// import { RequestWithUser } from "../middleware/auth";

// // export const createTestAndNotifyStudents = async (req: RequestWithUser, res: Response) => {

// //   if (!req.user) {
// //     return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
// //   }
// //   const teacherId = req.user.userId;

// //   const {
// //     class_id,
// //     section_id,
// //     subject_id,
// //     test_name,
// //     date_conducted,
// //     max_marks
// //   } = req.body;

// //   if (!class_id || !section_id || !subject_id || !test_name || !date_conducted || !max_marks) {
// //     return res.status(400).json({ error: 'Missing required fields for creating a test.' });
// //   }

// //   try {
// //     // We use a transaction to ensure all or nothing is written to the database
// //     const result = await prisma.$transaction(async (tx) => {
      
// //       // Step 1: Create the Test
// //       const newTest = await tx.test.create({
// //         data: {
// //           test_name,
// //           date_conducted: new Date(date_conducted),
// //           max_marks,
// //           class_id,
// //           section_id,
// //           subject_id,
// //           created_by: teacherId,
// //         },
// //       });

// //       // ⭐ Step 2: Create an Audit Log for this activity
// //       await tx.audit_log.create({
// //         data: {
// //           user_id: teacherId,
// //           action: 'CREATE_TEST',
// //           entity_type: 'Test',
// //           entity_id: newTest.test_id,
// //           remarks: `Teacher created test: '${test_name}' for section ${section_id}.`
// //         }
// //       });

// //       // Step 3: Find all students in the specified section
// //       const studentsInSection = await tx.student_profile.findMany({
// //         where: {
// //           section_id: section_id,
// //         },
// //         select: {
// //           student_id: true,
// //         },
// //       });

// //       if (studentsInSection.length > 0) {
// //         // Step 4: Store notifications in DB for students
// //         const notification = {
// //           title: `New Test Scheduled: ${test_name}`,
// //           message: `A new test has been scheduled for ${new Date(date_conducted).toLocaleDateString()}. Please prepare.`,
// //           test_id: newTest.test_id,
// //           section_id: section_id,
// //         };

// //         // Store in DB for persistence
// //         const notificationData = studentsInSection.map(student => ({
// //           user_id: student.student_id,
// //           title: notification.title,
// //           message: notification.message,
// //         }));

// //         await tx.notifications.createMany({
// //           data: notificationData,
// //         });
// //       }

// //       return newTest; // Return the created test if transaction is successful
// //     });

// //     res.status(201).json({
// //       message: 'Test created, audit logged, and students notified successfully!',
// //       test: result,
// //     });

// //   } catch (error) {
// //     console.error("Failed to create test:", error);
// //     res.status(500).json({ error: 'An internal server error occurred. The operation was rolled back.' });
// //   }
// // };




// export const createTestAndNotifyStudents = async (req: RequestWithUser, res: Response): Promise<void> => {
//   if (!req.user) {
//     res.status(401).json({ error: 'Unauthorized: User not authenticated' });
//     return;
//   }
//   const teacherId = req.user.userId;

//   const {
//     class_id,
//     section_id,
//     subject_id,
//     test_name,
//     date_conducted,
//     max_marks
//   } = req.body;

//   if (!class_id || !section_id || !subject_id || !test_name || !date_conducted || !max_marks) {
//     res.status(400).json({ error: 'Missing required fields for creating a test.' });
//     return;
//   }

//   try {
//     // We use a transaction to ensure all or nothing is written to the database
//     const result = await prisma.$transaction(async (tx) => {
      
//       // Step 1: Create the Test
//       const newTest = await tx.test.create({
//         data: {
//           test_name,
//           date_conducted: new Date(date_conducted),
//           max_marks,
//           class_id,
//           section_id,
//           subject_id,
//           created_by: teacherId,
//         },
//       });

//       // ⭐ Step 2: Create an Audit Log for this activity
//       await tx.audit_log.create({
//         data: {
//           user_id: teacherId,
//           action: 'CREATE_TEST',
//           entity_type: 'Test',
//           entity_id: newTest.test_id,
//           remarks: `Teacher created test: '${test_name}' for section ${section_id}.`
//         }
//       });

//       // Step 3: Find all students in the specified section
//       const studentsInSection = await tx.student_profile.findMany({
//         where: {
//           section_id: section_id,
//         },
//         select: {
//           student_id: true,
//         },
//       });

//       if (studentsInSection.length > 0) {
//         // Step 4: Store notifications in DB for students
//         const notification = {
//           title: `New Test Scheduled: ${test_name}`,
//           message: `A new test has been scheduled for ${new Date(date_conducted).toLocaleDateString()}. Please prepare.`,
//           test_id: newTest.test_id,
//           section_id: section_id,
//         };

//         // Store in DB for persistence
//         const notificationData = studentsInSection.map(student => ({
//           user_id: student.student_id,
//           title: notification.title,
//           message: notification.message,
//         }));

//         await tx.notifications.createMany({
//           data: notificationData,
//         });
//       }

//       return newTest; // Return the created test if transaction is successful
//     });

//     res.status(201).json({
//       message: 'Test created, audit logged, and students notified successfully!',
//       test: result,
//     });

//   } catch (error) {
//     console.error("Failed to create test:", error);
//     res.status(500).json({ error: 'An internal server error occurred. The operation was rolled back.' });
//   }
// };



import { Response } from "express";
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";
import { io } from "../server"; 

export const createTestAndNotifyStudents = async (req: RequestWithUser, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    return;
  }
  const teacherId = req.user.userId;

  const {
    class_id,
    section_id,
    subject_id,
    test_name,
    date_conducted,
    max_marks
  } = req.body;

  if (!class_id || !section_id || !subject_id || !test_name || !date_conducted || !max_marks) {
    res.status(400).json({ error: 'Missing required fields for creating a test.' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      
      const newTest = await tx.test.create({
        data: {
          test_name,
          date_conducted: new Date(date_conducted),
          max_marks,
          class_id,
          section_id,
          subject_id,
          created_by: teacherId,
        },
        include: {
          subject: {
            select: {
              subject_name: true,
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
        },
      });

      await tx.audit_log.create({
        data: {
          user_id: teacherId,
          action: 'CREATE_TEST',
          entity_type: 'Test',
          entity_id: newTest.test_id,
          remarks: `Teacher created test: '${test_name}' for section ${section_id}.`
        }
      });

      const studentsInSection = await tx.student_profile.findMany({
        where: {
          section_id: section_id,
        },
        select: {
          student_id: true,
        },
      });

      if (studentsInSection.length > 0) {
        const notification = {
          title: `📝 New Test Scheduled: ${test_name}`,
          message: `${test_name} (${newTest.subject.subject_name}) has been scheduled for ${new Date(date_conducted).toLocaleDateString()}. Max Marks: ${max_marks}. ${newTest.Renamedclass.class_name} - ${newTest.section.section_name}`,
          test_id: newTest.test_id,
          section_id: section_id,
        };

        const notificationData = studentsInSection.map(student => ({
          user_id: student.student_id,
          title: notification.title,
          message: notification.message,
        }));

        await tx.notifications.createMany({
          data: notificationData,
        });

        // 🔥 SOCKET.IO: Send real-time notifications to all students in the section
        studentsInSection.forEach((student) => {
          io.to(`user_${student.student_id}`).emit("new_notification", {
            title: notification.title,
            message: notification.message,
            type: "test_created",
            test_id: newTest.test_id,
            test_name: test_name,
            subject: newTest.subject.subject_name,
            date_conducted: new Date(date_conducted),
            max_marks: max_marks,
            created_at: new Date(),
          });
        });

        console.log(`✅ Notified ${studentsInSection.length} students about new test: ${test_name}`);
      }

      return newTest;
    });

    res.status(201).json({
      message: 'Test created, audit logged, and students notified successfully!',
      test: result,
    });

  } catch (error) {
    console.error("Failed to create test:", error);
    res.status(500).json({ error: 'An internal server error occurred. The operation was rolled back.' });
  }
};
