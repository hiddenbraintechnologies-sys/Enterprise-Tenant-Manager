import { Router, Request, Response } from "express";
import { z } from "zod";
import { tenantBrandingService } from "./branding-service";

const router = Router();

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
const urlRegex = /^https?:\/\/.+/;

const updateBrandingSchema = z.object({
  logoUrl: z.string().regex(urlRegex).optional().nullable(),
  logoAltUrl: z.string().regex(urlRegex).optional().nullable(),
  faviconUrl: z.string().regex(urlRegex).optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex).optional(),
  secondaryColor: z.string().regex(hexColorRegex).optional(),
  accentColor: z.string().regex(hexColorRegex).optional(),
  backgroundColor: z.string().regex(hexColorRegex).optional(),
  foregroundColor: z.string().regex(hexColorRegex).optional(),
  mutedColor: z.string().regex(hexColorRegex).optional(),
  borderColor: z.string().regex(hexColorRegex).optional(),
  fontFamily: z.string().max(100).optional(),
  fontFamilyHeading: z.string().max(100).optional().nullable(),
  fontFamilyMono: z.string().max(100).optional(),
  themeTokens: z.record(z.any()).optional(),
  emailFromName: z.string().max(100).optional().nullable(),
  emailFromAddress: z.string().email().optional().nullable(),
  emailReplyTo: z.string().email().optional().nullable(),
  emailSignature: z.string().optional().nullable(),
  emailHeaderHtml: z.string().optional().nullable(),
  emailFooterHtml: z.string().optional().nullable(),
  termsOfServiceUrl: z.string().regex(urlRegex).optional().nullable(),
  privacyPolicyUrl: z.string().regex(urlRegex).optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().max(50).optional().nullable(),
  supportUrl: z.string().regex(urlRegex).optional().nullable(),
  socialLinks: z.record(z.string()).optional(),
  customCss: z.string().max(50000).optional().nullable(),
});

const createEmailTemplateSchema = z.object({
  templateType: z.enum([
    "welcome",
    "password_reset",
    "email_verification",
    "booking_confirmation",
    "booking_reminder",
    "booking_cancellation",
    "invoice",
    "payment_receipt",
    "membership_welcome",
    "membership_renewal",
    "appointment_reminder",
    "notification",
    "custom",
  ]),
  templateName: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  availableVariables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const updateEmailTemplateSchema = createEmailTemplateSchema.partial();

router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const branding = await tenantBrandingService.getOrCreateBranding(tenantId);
    const cssVariables = tenantBrandingService.generateCssVariables(branding);

    res.json({ branding, cssVariables });
  } catch (error: any) {
    console.error("Get branding error:", error);
    res.status(500).json({ error: "Failed to get branding" });
  }
});

router.patch("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const parsed = updateBrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors,
      });
    }

    const branding = await tenantBrandingService.updateBranding(
      tenantId,
      parsed.data,
      userId
    );

    const cssVariables = tenantBrandingService.generateCssVariables(branding);

    res.json({ branding, cssVariables });
  } catch (error: any) {
    console.error("Update branding error:", error);
    res.status(500).json({ error: "Failed to update branding" });
  }
});

router.get("/css-variables", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const branding = await tenantBrandingService.getBranding(tenantId);
    const cssVariables = tenantBrandingService.generateCssVariables(branding);

    res.json({ cssVariables });
  } catch (error: any) {
    console.error("Get CSS variables error:", error);
    res.status(500).json({ error: "Failed to get CSS variables" });
  }
});

router.get("/email-templates", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const templateType = req.query.type as string | undefined;
    const templates = await tenantBrandingService.getEmailTemplates(
      tenantId,
      templateType
    );

    res.json({ templates });
  } catch (error: any) {
    console.error("Get email templates error:", error);
    res.status(500).json({ error: "Failed to get email templates" });
  }
});

router.post("/email-templates", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const parsed = createEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors,
      });
    }

    const template = await tenantBrandingService.createEmailTemplate(
      { ...parsed.data, tenantId },
      userId
    );

    res.status(201).json({ template });
  } catch (error: any) {
    console.error("Create email template error:", error);
    if (error.message.includes("unique constraint")) {
      return res.status(400).json({ error: "Template with this type and name already exists" });
    }
    res.status(500).json({ error: "Failed to create email template" });
  }
});

router.get("/email-templates/:templateId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { templateId } = req.params;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const template = await tenantBrandingService.getEmailTemplate(
      tenantId,
      templateId
    );

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ template });
  } catch (error: any) {
    console.error("Get email template error:", error);
    res.status(500).json({ error: "Failed to get email template" });
  }
});

router.patch("/email-templates/:templateId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    const { templateId } = req.params;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const parsed = updateEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors,
      });
    }

    const template = await tenantBrandingService.updateEmailTemplate(
      templateId,
      parsed.data,
      userId
    );

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ template });
  } catch (error: any) {
    console.error("Update email template error:", error);
    res.status(500).json({ error: "Failed to update email template" });
  }
});

router.delete("/email-templates/:templateId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    const { templateId } = req.params;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const deleted = await tenantBrandingService.deleteEmailTemplate(
      templateId,
      userId
    );

    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete email template error:", error);
    res.status(500).json({ error: "Failed to delete email template" });
  }
});

router.post("/email-templates/seed-defaults", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    await tenantBrandingService.seedDefaultTemplates(tenantId, userId);

    const templates = await tenantBrandingService.getEmailTemplates(tenantId);

    res.json({ templates });
  } catch (error: any) {
    console.error("Seed default templates error:", error);
    res.status(500).json({ error: "Failed to seed default templates" });
  }
});

router.post("/email-templates/:templateId/preview", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { templateId } = req.params;
    const { variables } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const template = await tenantBrandingService.getEmailTemplate(
      tenantId,
      templateId
    );

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const rendered = tenantBrandingService.renderEmailTemplate(
      template,
      variables || {}
    );

    res.json({ rendered });
  } catch (error: any) {
    console.error("Preview email template error:", error);
    res.status(500).json({ error: "Failed to preview email template" });
  }
});

export default router;
