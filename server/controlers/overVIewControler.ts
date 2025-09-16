import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const getTotals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [teacherCount, studentCount, classCount] = await prisma.$transaction([
      prisma.teacher_profile.count(),
      prisma.student_profile.count(),
      prisma.renamedclass.count(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        teachers: teacherCount,
        students: studentCount,
        classes: classCount,
      },
    });
  } catch (err) {
    return next(err);
  }
};


