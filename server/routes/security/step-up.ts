import { Router } from "express";
import type { Request, Response } from "express";
import { 
  getTotpConfig,
  isTotpEnabled,
  generateTotpSecret,
  verifyTotpCode,
  enableTotp,
  disableTotp,
  markStepUpVerified,
  type StepUpPurpose
} from "../../services/step-up-auth";
import { logSoc2Audit } from "../../services/soc2-audit";
import { getRequestContext } from "../../audit/logAudit";
import { storage } from "../../storage";

const router = Router();

interface AuthUser {
  id: string;
  tenantId: string;
  staffId?: string;
  role?: string;
}

/**
 * GET /api/security/totp/status
 * Check if TOTP is enabled for the current user.
 */
router.get("/totp/status", async (req: Request, res: Response) => {
  const user = req.user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const staff = await storage.getTenantStaffByUserId(user.id, user.tenantId);
    if (!staff) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    const enabled = await isTotpEnabled(staff.id);
    res.json({ enabled });
  } catch (error) {
    console.error("Error checking TOTP status:", error);
    res.status(500).json({ error: "Failed to check TOTP status" });
  }
});

/**
 * POST /api/security/totp/setup
 * Generate a new TOTP secret for enrollment.
 */
router.post("/totp/setup", async (req: Request, res: Response) => {
  const user = req.user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const staff = await storage.getTenantStaffByUserId(user.id, user.tenantId);
    if (!staff) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    const { secret, uri } = generateTotpSecret(staff.email);

    res.json({ 
      secret,
      uri,
      message: "Scan the QR code with your authenticator app, then verify with a code."
    });
  } catch (error) {
    console.error("Error setting up TOTP:", error);
    res.status(500).json({ error: "Failed to set up TOTP" });
  }
});

/**
 * POST /api/security/totp/enable
 * Enable TOTP after verifying with a code.
 */
router.post("/totp/enable", async (req: Request, res: Response) => {
  const user = req.user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { secret, code } = req.body;

  if (!secret || !code) {
    return res.status(400).json({ error: "Secret and code are required" });
  }

  try {
    const staff = await storage.getTenantStaffByUserId(user.id, user.tenantId);
    if (!staff) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    const success = await enableTotp(staff.id, user.tenantId, secret, code);

    if (!success) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const { ipAddress, userAgent } = getRequestContext(req);

    await logSoc2Audit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorRole: user.role,
      action: "MFA_ENROLLED",
      outcome: "success",
      targetType: "user",
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    res.json({ success: true, message: "TOTP enabled successfully" });
  } catch (error) {
    console.error("Error enabling TOTP:", error);
    res.status(500).json({ error: "Failed to enable TOTP" });
  }
});

/**
 * POST /api/security/totp/disable
 * Disable TOTP for the current user.
 */
router.post("/totp/disable", async (req: Request, res: Response) => {
  const user = req.user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Verification code is required" });
  }

  try {
    const staff = await storage.getTenantStaffByUserId(user.id, user.tenantId);
    if (!staff) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    const config = await getTotpConfig(staff.id);
    if (!config?.totpEnabled) {
      return res.status(400).json({ error: "TOTP is not enabled" });
    }

    const isValid = verifyTotpCode(config.totpSecret, code);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await disableTotp(staff.id);

    const { ipAddress, userAgent } = getRequestContext(req);

    await logSoc2Audit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorRole: user.role,
      action: "MFA_DISABLED",
      outcome: "success",
      targetType: "user",
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    res.json({ success: true, message: "TOTP disabled successfully" });
  } catch (error) {
    console.error("Error disabling TOTP:", error);
    res.status(500).json({ error: "Failed to disable TOTP" });
  }
});

/**
 * POST /api/security/stepup/verify
 * Verify OTP for step-up authentication.
 */
router.post("/stepup/verify", async (req: Request, res: Response) => {
  const user = req.user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code, purpose } = req.body;

  if (!code || !purpose) {
    return res.status(400).json({ error: "Code and purpose are required" });
  }

  const validPurposes: StepUpPurpose[] = [
    "force_logout",
    "revoke_session",
    "change_role",
    "change_permissions",
    "impersonate",
    "ip_rule_change",
    "sso_config",
    "billing_change",
    "data_export",
    "security_settings",
  ];

  if (!validPurposes.includes(purpose)) {
    return res.status(400).json({ error: "Invalid purpose" });
  }

  try {
    const staff = await storage.getTenantStaffByUserId(user.id, user.tenantId);
    if (!staff) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    const config = await getTotpConfig(staff.id);
    if (!config?.totpEnabled) {
      return res.status(400).json({ 
        error: "TOTP_NOT_ENABLED",
        message: "Please enable two-factor authentication first."
      });
    }

    const isValid = verifyTotpCode(config.totpSecret, code);
    if (!isValid) {
      const { ipAddress, userAgent } = getRequestContext(req);

      await logSoc2Audit({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorRole: user.role,
        action: "STEP_UP_VERIFIED",
        outcome: "fail",
        failureReason: "Invalid OTP code",
        ipAddress,
        userAgent,
        metadata: { purpose },
      });

      return res.status(400).json({ error: "INVALID_OTP" });
    }

    await markStepUpVerified(user.tenantId, user.id, purpose);

    const { ipAddress, userAgent } = getRequestContext(req);

    await logSoc2Audit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorRole: user.role,
      action: "STEP_UP_VERIFIED",
      outcome: "success",
      ipAddress,
      userAgent,
      metadata: { purpose },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error verifying step-up:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

export default router;
