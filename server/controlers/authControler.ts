import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authenticateJWT, DecodedToken } from "../middleware/auth";
import prisma from "./../db/prisma";

const JWT_SECRET = "your_jwt_secret";
const JWT_EXPIRES_IN = "7d";

interface User {
  user_id: number;
  name: string;
  email: string;
  mobile_number?: string;
  profile_picture: string;
  password_hash?: string;
  role: "Admin" | "Teacher" | "Student";
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string;
}

export const registerUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { name, email, password, mobileNumber } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      mobileNumber?: string;
    };

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        name: name,
        email: email,
        mobile_number: mobileNumber || null,
        password_hash: passwordHash,
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!newUser?.user_id) {
      return res
        .status(500)
        .json({ error: "User ID not found after registration" });
    }

    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        mobileNumber: newUser.mobile_number,
        profilePicture: newUser.profile_picture,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};

interface LoginRequestBody {
  email?: string;
  password?: string;
  role?: string;
}

export const loginUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email, password, role } = req.body as LoginRequestBody;

    console.log("Login attempt for role:", role);

    if (!email || !password || !role) {
      return res.status(400).json({
        error: "Email, password, and role are required",
        details: {
          email: !email ? "Email is required" : undefined,
          password: !password ? "Password is required" : undefined,
          role: !role ? "Role is required" : undefined,
        },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const validRoles = ["Student", "Teacher", "Admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const user = await prisma.users.findFirst({
      where: {
        email: email,
        role: role,
        status: "Active",
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        password_hash: true,
        role: true,
        status: true,
        push_token: true,
        created_at: true,
        updated_at: true,
      },
    });

    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials or inactive account",
        message: "Please check your email, password, and role",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash!);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    let profileData: any = null;

    if (user.role === "Student") {
      try {
        const studentProfile = await prisma.student_profile.findUnique({
          where: {
            student_id: user.user_id,
          },
        });

        if (studentProfile) {
          const classData = await (prisma as any).Renamedclass.findUnique({
            where: { class_id: studentProfile.class_id },
            select: { class_id: true, class_name: true },
          });

          const sectionData = await prisma.section.findUnique({
            where: { section_id: studentProfile.section_id },
            select: { section_id: true, section_name: true },
          });

          profileData = {
            student_id: studentProfile.student_id,
            roll_number: studentProfile.roll_number,
            class_id: studentProfile.class_id,
            section_id: studentProfile.section_id,
            dob: studentProfile.dob,
            guardian_name: studentProfile.guardian_name,
            guardian_mobile_number: studentProfile.guardian_mobile_number,
            student_mobile_number: studentProfile.student_mobile_number,
            created_at: studentProfile.created_at,
            updated_at: studentProfile.updated_at,
            class_name: classData?.class_name || null,
            section_name: sectionData?.section_name || null,
          };
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
        profileData = null;
      }
    }

    if (user.role === "Teacher") {
      try {
        const teacherProfile = await prisma.teacher_profile.findUnique({
          where: {
            teacher_id: user.user_id,
          },
          select: {
            teacher_id: true,
            assigned_subjects: true,
            class_assignments: true,
            created_at: true,
            updated_at: true,
          },
        });

        if (teacherProfile) {
          let enrichedSubjects = null;
          let enrichedClassAssignments = null;

          if (
            teacherProfile.assigned_subjects &&
            Array.isArray(teacherProfile.assigned_subjects)
          ) {
            try {
              const subjectIds = teacherProfile.assigned_subjects as number[];

              if (subjectIds.length > 0) {
                const subjects = await prisma.subject.findMany({
                  where: { subject_id: { in: subjectIds } },
                  select: {
                    subject_id: true,
                    subject_name: true,
                    class_id: true,
                  },
                });
                enrichedSubjects = subjects;
              } else {
                enrichedSubjects = [];
              }
            } catch (error) {
              console.error("Error enriching subjects:", error);
              enrichedSubjects = teacherProfile.assigned_subjects;
            }
          } else {
            enrichedSubjects = teacherProfile.assigned_subjects;
          }

          if (
            teacherProfile.class_assignments &&
            Array.isArray(teacherProfile.class_assignments)
          ) {
            try {
              const classAssignments = teacherProfile.class_assignments as Array<{
                class_id: number;
                section_id: number;
              }>;

              if (classAssignments.length > 0) {
                const enrichedAssignments = await Promise.all(
                  classAssignments.map(async (assignment) => {
                    const classData = await (prisma as any).Renamedclass.findUnique({
                      where: { class_id: assignment.class_id },
                      select: { class_id: true, class_name: true },
                    });

                    const sectionData = await prisma.section.findUnique({
                      where: { section_id: assignment.section_id },
                      select: { section_id: true, section_name: true },
                    });

                    return {
                      class_id: assignment.class_id,
                      section_id: assignment.section_id,
                      class_name: classData?.class_name || null,
                      section_name: sectionData?.section_name || null,
                    };
                  })
                );

                enrichedClassAssignments = enrichedAssignments;
              } else {
                enrichedClassAssignments = [];
              }
            } catch (error) {
              console.error("Error enriching class assignments:", error);
              enrichedClassAssignments = teacherProfile.class_assignments;
            }
          } else {
            enrichedClassAssignments = teacherProfile.class_assignments;
          }

          profileData = {
            teacher_id: teacherProfile.teacher_id,
            assigned_subjects: enrichedSubjects,
            class_assignments: enrichedClassAssignments,
            created_at: teacherProfile.created_at,
            updated_at: teacherProfile.updated_at,
          };
        }
      } catch (error) {
        console.error("Error fetching teacher profile:", error);
        profileData = null;
      }
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobile_number,
        profilePicture: user.profile_picture,
        role: user.role,
        status: user.status,
        hasPushToken: !!user.push_token,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      profile: profileData,
    });
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
      if (error.message.includes("prisma")) {
        return res.status(500).json({
          error: "Database error occurred",
          message: "Please try again later",
        });
      }
    }

    return res.status(500).json({
      error: "Login failed",
      message: "An unexpected error occurred",
    });
  }
};

export const getMe = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { userId } = (req as any).user as DecodedToken;

    const me = await prisma.users.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        mobile_number: true,
        profile_picture: true,
        role: true,
        status: true,
        push_token: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!me) {
      return res.status(404).json({ error: "User not found" });
    }

    let profileData: any = null;

    if (me.role === "Student") {
      try {
        const studentProfile = await prisma.student_profile.findUnique({
          where: {
            student_id: userId,
          },
        });

        if (studentProfile) {
          const classData = await (prisma as any).Renamedclass.findUnique({
            where: { class_id: studentProfile.class_id },
            select: { class_name: true },
          });

          const sectionData = await prisma.section.findUnique({
            where: { section_id: studentProfile.section_id },
            select: { section_name: true },
          });

          profileData = {
            student_id: studentProfile.student_id,
            roll_number: studentProfile.roll_number,
            class_id: studentProfile.class_id,
            section_id: studentProfile.section_id,
            dob: studentProfile.dob,
            guardian_name: studentProfile.guardian_name,
            guardian_mobile_number: studentProfile.guardian_mobile_number,
            student_mobile_number: studentProfile.student_mobile_number,
            created_at: studentProfile.created_at,
            updated_at: studentProfile.updated_at,
            class_name: classData?.class_name || null,
            section_name: sectionData?.section_name || null,
          };
        }
      } catch (error) {
        console.log("Error fetching student profile:", error);
        profileData = null;
      }
    }

    if (me.role === "Teacher") {
      try {
        const teacherProfile = await prisma.teacher_profile.findUnique({
          where: {
            teacher_id: userId,
          },
          select: {
            teacher_id: true,
            assigned_subjects: true,
            class_assignments: true,
            created_at: true,
            updated_at: true,
          },
        });
        profileData = teacherProfile || null;
      } catch (error) {
        console.log("Error fetching teacher profile:", error);
        profileData = null;
      }
    }

    return res.json({
      user: me,
      profile: profileData,
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



export const updatePushToken = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const { push_token } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found",
      });
      return;
    }

    if (!push_token) {
      res.status(400).json({
        success: false,
        message: "push_token is required",
      });
      return;
    }

    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        push_token,
        updated_at: new Date(),
      },
      select: {
        user_id: true,
        email: true,
        push_token: true,
      },
    });

    console.log(`✅ Push token updated for user ${userId}`);

    res.json({
      success: true,
      message: "Push token updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Update push token error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removePushToken = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        push_token: null,
        updated_at: new Date(),
      },
    });

    console.log(`✅ Push token removed for user ${userId}`);

    res.json({
      success: true,
      message: "Push token removed successfully",
    });
  } catch (error: any) {
    console.error("Remove push token error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};