import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantStaff } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function sessionVersionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.context?.user?.id;
  const tenantId = req.context?.tenant?.id;
  const tokenSessionVersion = (req as any).tokenSessionVersion;

  if (!userId || !tenantId || tokenSessionVersion === undefined) {
    return next();
  }

  try {
    const [staff] = await db
      .select({ sessionVersion: tenantStaff.sessionVersion })
      .from(tenantStaff)
      .where(
        and(
          eq(tenantStaff.tenantId, tenantId),
          eq(tenantStaff.userId, userId)
        )
      )
      .limit(1);
    
    if (!staff) {
      return next();
    }

    if (tokenSessionVersion !== staff.sessionVersion) {
      res.clearCookie("session");
      res.clearCookie("connect.sid");
      return res.status(401).json({
        message: "Session invalidated",
        code: "SESSION_INVALIDATED",
        reason: "Your session has been revoked. Please sign in again.",
      });
    }
  } catch (error) {
    console.error("[session-version] Error checking session version:", error);
  }

  next();
}
