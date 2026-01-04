import { Router, Request, Response, NextFunction } from "express";
import { indiaComplianceService } from "./india-compliance-service";
import {
  insertGstConfigurationSchema,
  insertGstInvoiceSchema,
  insertDltTemplateSchema,
  insertRbiPaymentComplianceSchema,
} from "@shared/schema";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { tenantIsolationMiddleware } from "../tenant-isolation";

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const updateGstConfigSchema = insertGstConfigurationSchema.partial().omit({ tenantId: true });
const updateDltTemplateSchema = insertDltTemplateSchema.partial().omit({ tenantId: true });
const updateRbiComplianceSchema = insertRbiPaymentComplianceSchema.partial().omit({ tenantId: true });

router.post("/gst/validate-gstin",
  asyncHandler(async (req: Request, res: Response) => {
    const { gstin } = req.body;
    if (!gstin) {
      res.status(400).json({ error: "GSTIN is required" });
      return;
    }
    const result = indiaComplianceService.validateGstin(gstin);
    res.json(result);
  })
);

router.get("/gst/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const config = await indiaComplianceService.getGstConfiguration(tenantId);
    res.json(config || {});
  })
);

router.put("/gst/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const validated = insertGstConfigurationSchema.parse({ ...req.body, tenantId });
    const config = await indiaComplianceService.saveGstConfiguration(validated);
    res.json(config);
  })
);

router.post("/gst/calculate",
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, gstRate, isInterState } = req.body;
    if (typeof amount !== "number" || typeof gstRate !== "number") {
      res.status(400).json({ error: "Amount and gstRate are required as numbers" });
      return;
    }
    const result = indiaComplianceService.calculateGst(amount, gstRate, isInterState ?? false);
    res.json(result);
  })
);

router.get("/gst/invoices",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { status, fromDate, toDate } = req.query;
    const invoices = await indiaComplianceService.getGstInvoices(tenantId, {
      status: status as string | undefined,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    });
    res.json(invoices);
  })
);

router.get("/gst/invoices/:invoiceId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const invoice = await indiaComplianceService.getGstInvoice(tenantId, req.params.invoiceId);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(invoice);
  })
);

router.post("/gst/invoices",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const userId = (req as any).user?.id;
    const validated = insertGstInvoiceSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const invoice = await indiaComplianceService.createGstInvoice(validated);
    res.status(201).json(invoice);
  })
);

router.get("/dlt/templates",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { category } = req.query;
    const templates = await indiaComplianceService.getDltTemplates(tenantId, category as string | undefined);
    res.json(templates);
  })
);

router.post("/dlt/templates",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const validated = insertDltTemplateSchema.parse({ ...req.body, tenantId });
    const template = await indiaComplianceService.registerDltTemplate(validated);
    res.status(201).json(template);
  })
);

router.patch("/dlt/templates/:templateId/status",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { status, approvedAt } = req.body;
    const statusSchema = z.object({
      status: z.enum(["pending", "approved", "rejected", "expired"]),
      approvedAt: z.string().datetime().optional(),
    });
    const validated = statusSchema.parse({ status, approvedAt });
    const template = await indiaComplianceService.updateDltTemplateStatus(
      tenantId,
      req.params.templateId,
      validated.status,
      validated.approvedAt ? new Date(validated.approvedAt) : undefined
    );
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(template);
  })
);

router.post("/aadhaar/validate",
  asyncHandler(async (req: Request, res: Response) => {
    const { aadhaar } = req.body;
    if (!aadhaar) {
      res.status(400).json({ error: "Aadhaar number is required" });
      return;
    }
    const result = indiaComplianceService.validateAadhaar(aadhaar);
    res.json(result);
  })
);

router.post("/aadhaar/mask",
  asyncHandler(async (req: Request, res: Response) => {
    const { aadhaar } = req.body;
    if (!aadhaar) {
      res.status(400).json({ error: "Aadhaar number is required" });
      return;
    }
    const masked = indiaComplianceService.maskAadhaar(aadhaar);
    res.json({ masked });
  })
);

router.get("/aadhaar/access-logs",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { entityType, entityId } = req.query;
    const logs = await indiaComplianceService.getAadhaarAccessLogs(tenantId, {
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
    });
    res.json(logs);
  })
);

router.post("/aadhaar/log-access",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const userId = (req as any).user?.id;
    const { entityType, entityId, fieldName, aadhaar, accessReason } = req.body;

    await indiaComplianceService.logAadhaarAccess({
      tenantId,
      entityType,
      entityId,
      fieldName,
      maskedValue: aadhaar,
      accessedBy: userId,
      accessReason,
      ipAddress: req.ip || "",
      userAgent: req.get("user-agent") || "",
    });
    res.json({ logged: true });
  })
);

router.get("/rbi/compliance",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const compliance = await indiaComplianceService.getRbiCompliance(tenantId);
    res.json(compliance || {});
  })
);

router.put("/rbi/compliance",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const validated = insertRbiPaymentComplianceSchema.parse({ ...req.body, tenantId });
    const compliance = await indiaComplianceService.saveRbiCompliance(validated);
    res.json(compliance);
  })
);

router.get("/rbi/validate",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const compliance = await indiaComplianceService.getRbiCompliance(tenantId);
    if (!compliance) {
      res.json({ compliant: false, issues: ["RBI compliance configuration not found"], recommendations: [] });
      return;
    }
    const result = indiaComplianceService.validateRbiCompliance(compliance);
    res.json(result);
  })
);

router.get("/checklist",
  asyncHandler(async (_req: Request, res: Response) => {
    const checklist = indiaComplianceService.getIndiaComplianceChecklist();
    res.json(checklist);
  })
);

router.get("/state-codes",
  asyncHandler(async (_req: Request, res: Response) => {
    const stateCodes = {
      "01": "Jammu and Kashmir",
      "02": "Himachal Pradesh",
      "03": "Punjab",
      "04": "Chandigarh",
      "05": "Uttarakhand",
      "06": "Haryana",
      "07": "Delhi",
      "08": "Rajasthan",
      "09": "Uttar Pradesh",
      "10": "Bihar",
      "11": "Sikkim",
      "12": "Arunachal Pradesh",
      "13": "Nagaland",
      "14": "Manipur",
      "15": "Mizoram",
      "16": "Tripura",
      "17": "Meghalaya",
      "18": "Assam",
      "19": "West Bengal",
      "20": "Jharkhand",
      "21": "Odisha",
      "22": "Chhattisgarh",
      "23": "Madhya Pradesh",
      "24": "Gujarat",
      "26": "Dadra and Nagar Haveli and Daman and Diu",
      "27": "Maharashtra",
      "28": "Andhra Pradesh (Old)",
      "29": "Karnataka",
      "30": "Goa",
      "31": "Lakshadweep",
      "32": "Kerala",
      "33": "Tamil Nadu",
      "34": "Puducherry",
      "35": "Andaman and Nicobar",
      "36": "Telangana",
      "37": "Andhra Pradesh",
      "38": "Ladakh",
    };
    res.json(stateCodes);
  })
);

export default router;
