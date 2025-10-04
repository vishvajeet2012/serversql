// utils/autoFeedbackHelper.ts
import prisma from "../db/prisma";

interface FeedbackTemplate {
  min: number;
  max: number;
  message: string;
}

const FEEDBACK_TEMPLATES: FeedbackTemplate[] = [
  { min: 0, max: 10, message: "Needs significant improvement. Please revise the basics and focus on understanding core concepts. Don't hesitate to ask for help." },
  { min: 11, max: 20, message: "Weak performance. Focus on fundamental concepts and practice regularly. Consider attending extra classes." },
  { min: 21, max: 30, message: "Below average performance. Requires extra practice and better preparation. Work on weak areas consistently." },
  { min: 31, max: 40, message: "Poor performance. Consider seeking additional help from teachers or peers. Regular practice is essential." },
  { min: 41, max: 50, message: "Below expectations. Work harder on this topic and improve your study techniques. You have potential!" },
  { min: 51, max: 60, message: "Average performance. There's definitely room for improvement. Keep practicing and strengthen your weak areas." },
  { min: 61, max: 70, message: "Good effort! You're on the right track. Keep practicing to excel and aim higher in the next test." },
  { min: 71, max: 80, message: "Very good work! Strong understanding shown. Continue this momentum and you'll achieve excellence." },
  { min: 81, max: 90, message: "Excellent work! Keep up this outstanding performance. You're doing great!" },
  { min: 91, max: 100, message: "Outstanding performance! Exceptional work. You've demonstrated excellent mastery of the subject. Keep shining!" }
];

export function getAutoFeedbackMessage(percentage: number): string {
  const roundedPercentage = Math.round(percentage);
  const template = FEEDBACK_TEMPLATES.find(
    (t) => roundedPercentage >= t.min && roundedPercentage <= t.max
  );
  return template?.message || "Performance recorded. Keep working hard!";
}

export async function createAutoFeedback(
  test_id: number,
  student_id: number,
  teacher_id: number,
  marks_obtained: number,
  max_marks: number
): Promise<void> {
  try {
    const percentage = (marks_obtained / max_marks) * 100;
    const message = getAutoFeedbackMessage(percentage);

    // Get or create system user
    let systemUser = await prisma.users.findFirst({
      where: { email: "system@school.app" }
    });

    if (!systemUser) {
      systemUser = await prisma.users.create({
        data: {
          name: "System Bot",
          email: "system@school.app",
          password_hash: "N/A",
          role: "Admin",
          status: "Active"
        }
      });
    }

    // Create auto-feedback
    await prisma.feedback.create({
      data: {
        teacher_id,
        student_id,
        test_id,
        message,
        created_by: systemUser.user_id,
        sender_role: "System",
      }
    });

    console.log(`✅ Auto-feedback created for student ${student_id}`);
  } catch (error) {
    console.error("❌ Error creating auto-feedback:", error);
  }
}
