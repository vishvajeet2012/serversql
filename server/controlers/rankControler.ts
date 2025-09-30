import { Response, NextFunction } from "express";
import prisma from '../db/prisma';
import { RequestWithUser } from "../middleware/auth";
interface StudentRankData {

    student_id: number;
    student_name: string;
    student_email: string;
    marks_obtained: number;
    max_marks: number;
    percentage: number;
    rank: number;
    status: string;
  }
  
  interface TestRankingResponse {
    test_id: number;
    test_name: string;
    class_name: string;
    section_name: string;
    subject_name: string;
    date_conducted: string;
    max_marks: number;
    total_students: number;
    students_attempted: number;
    average_marks: number;
    highest_marks: number;
    lowest_marks: number;
    student_rankings: StudentRankData[];
  }
  
  interface RankDistributionData {
    rank_range: string;
    count: number;
    percentage: number;
  }
  
  export const rankController = {
    getTestRanking: async (
      req: RequestWithUser,
      res: Response
    ): Promise<void> => {
      try {
        const { test_id } = req.body;
        const teacher_id = req.user?.userId;
  
        if (!teacher_id) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
  
        if (!test_id) {
          res.status(400).json({ error: "Test ID is required" });
          return;
        }
  
        // Verify the test exists and was created by this teacher
        const test = await prisma.test.findFirst({
          where: {
            test_id: parseInt(test_id),
            created_by: teacher_id
          },
          include: {
            Renamedclass: {
              select: { class_name: true }
            },
            section: {
              select: { section_name: true }
            },
            subject: {
              select: { subject_name: true }
            }
          }
        });
  
        if (!test) {
          res.status(403).json({ 
            error: "Forbidden: Test not found or not created by you" 
          });
          return;
        }
  
        // Get all marks for this test with student details
        const marksData = await prisma.marks.findMany({
          where: {
            test_id: parseInt(test_id),
            status: "Approved" // Only consider approved marks for ranking
          },
          include: {
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
          orderBy: {
            marks_obtained: 'desc'
          }
        });
  
        // Calculate rankings with proper tie handling
        const studentRankings: StudentRankData[] = [];
        let currentRank = 1;
        let previousMarks = -1;
        let studentsWithSameMarks = 0;
  
        marksData.forEach((mark, index) => {
          if (mark.marks_obtained !== previousMarks) {
            currentRank = index + 1;
            studentsWithSameMarks = 0;
          } else {
            studentsWithSameMarks++;
          }
  
          const percentage = (mark.marks_obtained / test.max_marks) * 100;
  
          studentRankings.push({
            student_id: mark.student_id,
            student_name: mark.student_profile.users.name,
            student_email: mark.student_profile.users.email,
            marks_obtained: mark.marks_obtained,
            max_marks: test.max_marks,
            percentage: Math.round(percentage * 100) / 100,
            rank: currentRank,
            status: mark.status|| "",
          });
  
          previousMarks = mark.marks_obtained;
        });
  
        // Calculate statistics
        const totalStudentsInClass = await prisma.student_profile.count({
          where: {
            class_id: test.class_id,
            section_id: test.section_id
          }
        });
  
        const marksArray = marksData.map(m => m.marks_obtained);
        const averageMarks = marksArray.length > 0 
          ? Math.round((marksArray.reduce((sum, marks) => sum + marks, 0) / marksArray.length) * 100) / 100
          : 0;
        const highestMarks = marksArray.length > 0 ? Math.max(...marksArray) : 0;
        const lowestMarks = marksArray.length > 0 ? Math.min(...marksArray) : 0;
  
        const response: TestRankingResponse = {
          test_id: test.test_id,
          test_name: test.test_name,
          class_name: test.Renamedclass.class_name,
          section_name: test.section.section_name,
          subject_name: test.subject.subject_name,
          date_conducted: test?.date_conducted?.toISOString().split('T')[0] || "",
          max_marks: test.max_marks,
          total_students: totalStudentsInClass,
          students_attempted: marksData.length,
          average_marks: averageMarks,
          highest_marks: highestMarks,
          lowest_marks: lowestMarks,
          student_rankings: studentRankings
        };
  
        res.status(200).json({
          message: "Test ranking retrieved successfully",
          data: response
        });
  
      } catch (error) {
        console.error("Error fetching test ranking:", error);
        res.status(500).json({ 
          error: "Internal server error while fetching test ranking" 
        });
      }
    },
  
    // Get ranking distribution for pie chart data
    getRankDistribution: async (
      req: RequestWithUser,
      res: Response
    ): Promise<void> => {
      try {
        const { test_id } = req.params;
        const teacher_id = req.user?.userId;
  
        if (!teacher_id) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
  
        // Verify test ownership
        const test = await prisma.test.findFirst({
          where: {
            test_id: parseInt(test_id as string),
            created_by: teacher_id
          }
        });
  
        if (!test) {
          res.status(403).json({ 
            error: "Forbidden: Test not found or not created by you" 
          });
          return;
        }
  
        // Get approved marks for ranking
        const marksData = await prisma.marks.findMany({
          where: {
            test_id: parseInt(test_id as string),
            status: "Approved"
          },
          select: {
            marks_obtained: true
          },
          orderBy: {
            marks_obtained: 'desc'
          }
        });
  
        if (marksData.length === 0) {
          res.status(200).json({
            message: "No approved marks found for ranking distribution",
            data: []
          });
          return;
        }
  
        // Calculate percentage-based distribution for pie chart
        const totalStudents = marksData.length;
        const distributions: RankDistributionData[] = [];
  
        // Define percentage ranges
        const ranges = [
          { min: 90, max: 100, label: "Excellent (90-100%)" },
          { min: 80, max: 89, label: "Very Good (80-89%)" },
          { min: 70, max: 79, label: "Good (70-79%)" },
          { min: 60, max: 69, label: "Average (60-69%)" },
          { min: 50, max: 59, label: "Below Average (50-59%)" },
          { min: 0, max: 49, label: "Poor (0-49%)" }
        ];
  
        ranges.forEach(range => {
          const count = marksData.filter(mark => {
            const percentage = (mark.marks_obtained / test.max_marks) * 100;
            return percentage >= range.min && percentage <= range.max;
          }).length;
  
          if (count > 0) {
            distributions.push({
              rank_range: range.label,
              count: count,
              percentage: Math.round((count / totalStudents) * 100 * 100) / 100
            });
          }
        });
  
        res.status(200).json({
          message: "Rank distribution retrieved successfully",
          data: {
            test_id: parseInt(test_id as string),
            test_name: test.test_name,
            total_students: totalStudents,
            distribution: distributions
          }
        });
  
      } catch (error) {
        console.error("Error fetching rank distribution:", error);
        res.status(500).json({ 
          error: "Internal server error while fetching rank distribution" 
        });
      }
    },
  
    // Get all tests created by teacher with ranking summary
    getMyTestsWithRankings: async (
      req: RequestWithUser,
      res: Response
    ): Promise<void> => {
      try {
        const teacher_id = req.user?.userId;
        const { class_id, section_id, subject_id } = req.query;
  
        if (!teacher_id) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
  
        const whereCondition: any = {
          created_by: teacher_id
        };
  
        if (class_id) whereCondition.class_id = parseInt(class_id as string);
        if (section_id) whereCondition.section_id = parseInt(section_id as string);
        if (subject_id) whereCondition.subject_id = parseInt(subject_id as string);
  
        // Get all tests created by teacher
        const tests = await prisma.test.findMany({
          where: whereCondition,
          include: {
            Renamedclass: {
              select: { class_name: true }
            },
            section: {
              select: { section_name: true }
            },
            subject: {
              select: { subject_name: true }
            },
            marks: {
              where: { status: "Approved" },
              select: {
                marks_obtained: true,
                student_id: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        });
  
        // Calculate ranking summary for each test
        const testsWithRankingSummary = tests.map(test => {
          const approvedMarks = test.marks;
          const totalStudentsAttempted = approvedMarks.length;
          
          let averageMarks = 0;
          let highestMarks = 0;
          let lowestMarks = 0;
  
          if (totalStudentsAttempted > 0) {
            const marksArray = approvedMarks.map(m => m.marks_obtained);
            averageMarks = Math.round((marksArray.reduce((sum, marks) => sum + marks, 0) / marksArray.length) * 100) / 100;
            highestMarks = Math.max(...marksArray);
            lowestMarks = Math.min(...marksArray);
          }
  
          return {
            test_id: test.test_id,
            test_name: test.test_name,
            class_name: test.Renamedclass.class_name,
            section_name: test.section.section_name,
            subject_name: test.subject.subject_name,
            date_conducted: test.date_conducted.toISOString().split('T')[0],
            max_marks: test.max_marks,
            students_attempted: totalStudentsAttempted,
            average_marks: averageMarks,
            highest_marks: highestMarks,
            lowest_marks: lowestMarks,
            average_percentage: totalStudentsAttempted > 0 
              ? Math.round((averageMarks / test.max_marks) * 100 * 100) / 100 
              : 0,
            created_at: test.created_at,
            updated_at: test.updated_at
          };
        });
  
        res.status(200).json({
          message: "Tests with ranking summary retrieved successfully",
          data: testsWithRankingSummary,
          total: testsWithRankingSummary.length
        });
  
      } catch (error) {
        console.error("Error fetching tests with rankings:", error);
        res.status(500).json({ 
          error: "Internal server error while fetching tests with rankings" 
        });
      }
    },
  
    // Get student's rank across all tests in a class/section
    getStudentOverallRanking: async (
      req: RequestWithUser,
      res: Response
    ): Promise<void> => {
      try {
        const { student_id, class_id, section_id } = req.params;
        const teacher_id = req.user?.userId;
  
        if (!teacher_id) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
  
        // Get all tests created by this teacher for the specified class/section
        const tests = await prisma.test.findMany({
          where: {
            created_by: teacher_id,
            class_id: parseInt(class_id as string),
            section_id: parseInt(section_id as string)
          },
          include: {
            marks: {
              where: {
                status: "Approved"
              },
              include: {
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
            }
          }
        });
  
        // Calculate overall performance for the specific student
        const studentPerformance = tests.map(test => {
          const studentMark = test.marks.find(m => m.student_id === parseInt(student_id as string));
          const allMarks = test.marks.map(m => m.marks_obtained).sort((a, b) => b - a);
          
          let rank = 0;
          if (studentMark) {
            rank = allMarks.findIndex(marks => marks === studentMark.marks_obtained) + 1;
          }
  
          return {
            test_id: test.test_id,
            test_name: test.test_name,
            date_conducted: test.date_conducted,
            max_marks: test.max_marks,
            marks_obtained: studentMark?.marks_obtained || 0,
            rank: rank,
            total_students: allMarks.length,
            percentage: studentMark 
              ? Math.round((studentMark.marks_obtained / test.max_marks) * 100 * 100) / 100
              : 0
          };
        });
  
        // Calculate overall statistics
        const totalTests = studentPerformance.filter(p => p.marks_obtained > 0).length;
        const averagePercentage = totalTests > 0 
          ? Math.round((studentPerformance.reduce((sum, p) => sum + p.percentage, 0) / totalTests) * 100) / 100
          : 0;
  
        res.status(200).json({
          message: "Student overall ranking retrieved successfully",
          data: {
            student_id: parseInt(student_id as string || ""),
            class_id: parseInt(class_id as string || ""),
            section_id: parseInt(section_id as string || ""),
            total_tests: totalTests,
            average_percentage: averagePercentage,
            test_performances: studentPerformance
          }
        });
  
      } catch (error) {
        console.error("Error fetching student overall ranking:", error);
        res.status(500).json({ 
          error: "Internal server error while fetching student overall ranking" 
        });
      }
    }
  };
  