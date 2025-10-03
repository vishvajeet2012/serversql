// jobs/notificationJobs.ts
import prisma from "../db/prisma";
import { notifyStudentsAboutUpcomingTest } from "../util/notficationServieces";

export const checkUpcomingTests = async (io: any) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Get tests in 3 days
    const threeDaysLater = new Date(currentDate);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);

    // Get tests in 1 day
    const oneDayLater = new Date(currentDate);
    oneDayLater.setDate(oneDayLater.getDate() + 1);
    oneDayLater.setHours(23, 59, 59, 999);

    // Find tests happening in 3 days
    const testsIn3Days = await prisma.test.findMany({
      where: {
        date_conducted: {
          gte: threeDaysLater,
          lt: new Date(threeDaysLater.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        subject: {
          select: {
            subject_name: true,
          },
        },
      },
    });

    // Find tests happening in 1 day
    const testsIn1Day = await prisma.test.findMany({
      where: {
        date_conducted: {
          gte: oneDayLater,
          lt: new Date(oneDayLater.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        subject: {
          select: {
            subject_name: true,
          },
        },
      },
    });

    // Notify about tests in 3 days
    for (const test of testsIn3Days) {
      await notifyStudentsAboutUpcomingTest(
        test.class_id,
        test.section_id,
        test.test_name,
        test.subject.subject_name,
        test.date_conducted,
        3,
        io
      );
    }

    // Notify about tests in 1 day
    for (const test of testsIn1Day) {
      await notifyStudentsAboutUpcomingTest(
        test.class_id,
        test.section_id,
        test.test_name,
        test.subject.subject_name,
        test.date_conducted,
        1,
        io
      );
    }

    console.log(
      `Notification job completed: ${testsIn3Days.length} tests in 3 days, ${testsIn1Day.length} tests in 1 day`
    );
  } catch (error) {
    console.error("Error in checkUpcomingTests job:", error);
  }
};
