// controllers/auditLogController.ts
import { Response } from "express";
import { RequestWithUser } from "../middleware/auth";
import prisma from "../db/prisma";

export const auditLogController = {
  // Get All Audit Logs (Simple - Admin Only)
  getAllAuditLogs: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userRole = req.user?.role;

      if (userRole !== "Admin") {
        res.status(403).json({ error: "Only admins can access audit logs" });
        return;
      }

      const auditLogs = await prisma.audit_log.findMany({
        include: {
          users: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          timestamp: "desc"
        },
        take: 100 // Last 100 logs
      });

      res.status(200).json({
        success: true,
        data: auditLogs.map(log => ({
          log_id: log.log_id,
          user_name: log.users.name,
          user_role: log.users.role,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          remarks: log.remarks,
          timestamp: log.timestamp
        })),
        total: auditLogs.length
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
