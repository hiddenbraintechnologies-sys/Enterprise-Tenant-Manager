import type { Request, Response, NextFunction } from "express";
import { hasRecentStepUp, type StepUpPurpose } from "../services/step-up-auth";

interface AuthUser {
  id: string;
  tenantId: string;
  staffId?: string;
}

/**
 * Middleware to require step-up authentication for sensitive actions.
 * 
 * Returns 428 Precondition Required if step-up is needed.
 */
export function requireStepUp(purpose: StepUpPurpose, windowSeconds: number = 600) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "test" && req.headers["x-stepup-test-bypass"] === "1") {
      return next();
    }

    const user = req.user as AuthUser | undefined;
    
    if (!user?.id || !user?.tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasVerified = await hasRecentStepUp(
      user.tenantId,
      user.id,
      purpose,
      windowSeconds
    );

    if (!hasVerified) {
      return res.status(428).json({
        error: "STEP_UP_REQUIRED",
        code: "STEP_UP_REQUIRED",
        purpose,
        message: "This action requires additional verification. Please enter your OTP code.",
      });
    }

    next();
  };
}
