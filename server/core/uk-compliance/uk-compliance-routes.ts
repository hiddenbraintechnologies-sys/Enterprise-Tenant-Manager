import { Router, Request, Response, NextFunction } from "express";
import { ukComplianceService } from "./uk-compliance-service";
import {
  insertUkVatConfigurationSchema,
  insertUkVatInvoiceSchema,
  insertGdprConsentRecordSchema,
  insertUkDataRetentionPolicySchema,
  insertUkDataRetentionLogSchema,
  insertGdprDsarRequestSchema,
  insertGdprDataBreachSchema,
  insertUkComplianceSettingsSchema,
} from "@shared/schema";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { tenantIsolationMiddleware } from "../tenant-isolation";

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

function getTenantId(req: Request): string | null {
  return (req as any).context?.tenant?.id || null;
}

router.get("/vat-rates", (_req: Request, res: Response) => {
  res.json(ukComplianceService.getVatRates());
});

router.get("/lawful-bases", (_req: Request, res: Response) => {
  res.json(ukComplianceService.getLawfulBases());
});

router.get("/dsar-types", (_req: Request, res: Response) => {
  res.json(ukComplianceService.getDsarTypes());
});

router.get("/checklist", (_req: Request, res: Response) => {
  res.json(ukComplianceService.getUkComplianceChecklist());
});

router.get("/default-retention-policies", (_req: Request, res: Response) => {
  res.json(ukComplianceService.getDefaultRetentionPolicies());
});

router.post("/vat/validate", (req: Request, res: Response) => {
  const { vatNumber } = req.body;
  if (!vatNumber) {
    res.status(400).json({ error: "VAT number is required" });
    return;
  }
  res.json(ukComplianceService.validateVatNumber(vatNumber));
});

router.post("/vat/calculate", (req: Request, res: Response) => {
  const { netAmount, rateType, isReverseCharge, isEcSupply } = req.body;
  if (typeof netAmount !== "number") {
    res.status(400).json({ error: "Net amount is required" });
    return;
  }
  res.json(ukComplianceService.calculateVat(netAmount, rateType, { isReverseCharge, isEcSupply }));
});

router.post("/breach/assess", (req: Request, res: Response) => {
  const { dataTypesAffected, dataSubjectsAffected, breachType } = req.body;
  if (!breachType) {
    res.status(400).json({ error: "Breach type is required" });
    return;
  }
  const assessment = ukComplianceService.assessBreachSeverity({
    dataTypesAffected: dataTypesAffected || [],
    dataSubjectsAffected: dataSubjectsAffected || 0,
    breachType,
  });
  res.json(assessment);
});

router.get("/vat/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const config = await ukComplianceService.getVatConfiguration(tenantId);
    res.json(config || { message: "No VAT configuration found" });
  })
);

router.post("/vat/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertUkVatConfigurationSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const config = await ukComplianceService.createVatConfiguration(parsed.data);
    res.status(201).json(config);
  })
);

router.put("/vat/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const config = await ukComplianceService.updateVatConfiguration(tenantId, req.body);
    res.json(config);
  })
);

router.get("/vat/invoices",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { status } = req.query;
    const invoices = await ukComplianceService.getVatInvoices(tenantId, { status: status as string });
    res.json(invoices);
  })
);

router.post("/vat/invoices",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertUkVatInvoiceSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const invoice = await ukComplianceService.createVatInvoice(parsed.data);
    res.status(201).json(invoice);
  })
);

router.get("/vat/invoices/:id",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const invoice = await ukComplianceService.getVatInvoice(tenantId, req.params.id);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(invoice);
  })
);

router.get("/consent",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { dataSubjectId, consentType } = req.query;
    const records = await ukComplianceService.getConsentRecords(tenantId, {
      dataSubjectId: dataSubjectId as string,
      consentType: consentType as string,
    });
    res.json(records);
  })
);

router.post("/consent",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertGdprConsentRecordSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const record = await ukComplianceService.recordConsent(parsed.data);
    res.status(201).json(record);
  })
);

router.post("/consent/:id/withdraw",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { reason } = req.body;
    const record = await ukComplianceService.withdrawConsent(tenantId, req.params.id, reason);
    if (!record) {
      res.status(404).json({ error: "Consent record not found" });
      return;
    }
    res.json(record);
  })
);

router.get("/consent/active/:dataSubjectId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const records = await ukComplianceService.getActiveConsents(tenantId, req.params.dataSubjectId);
    res.json(records);
  })
);

router.get("/retention-policies",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const policies = await ukComplianceService.getRetentionPolicies(tenantId);
    res.json(policies);
  })
);

router.post("/retention-policies",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertUkDataRetentionPolicySchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const policy = await ukComplianceService.createRetentionPolicy(parsed.data);
    res.status(201).json(policy);
  })
);

router.put("/retention-policies/:id",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const policy = await ukComplianceService.updateRetentionPolicy(tenantId, req.params.id, req.body);
    if (!policy) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }
    res.json(policy);
  })
);

router.get("/retention-logs",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { policyId, action } = req.query;
    const logs = await ukComplianceService.getRetentionLogs(tenantId, {
      policyId: policyId as string,
      action: action as string,
    });
    res.json(logs);
  })
);

router.post("/retention-logs",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertUkDataRetentionLogSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const log = await ukComplianceService.logRetentionAction(parsed.data);
    res.status(201).json(log);
  })
);

router.get("/dsar",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { status, requestType } = req.query;
    const requests = await ukComplianceService.getDsarRequests(tenantId, {
      status: status as string,
      requestType: requestType as string,
    });
    res.json(requests);
  })
);

router.post("/dsar",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertGdprDsarRequestSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const request = await ukComplianceService.createDsarRequest(parsed.data);
    res.status(201).json(request);
  })
);

router.get("/dsar/:id",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const request = await ukComplianceService.getDsarRequest(tenantId, req.params.id);
    if (!request) {
      res.status(404).json({ error: "DSAR request not found" });
      return;
    }
    res.json(request);
  })
);

router.put("/dsar/:id",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const request = await ukComplianceService.updateDsarRequest(tenantId, req.params.id, req.body);
    if (!request) {
      res.status(404).json({ error: "DSAR request not found" });
      return;
    }
    res.json(request);
  })
);

router.get("/breaches",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const { status, severity } = req.query;
    const breaches = await ukComplianceService.getDataBreaches(tenantId, {
      status: status as string,
      severity: severity as string,
    });
    res.json(breaches);
  })
);

router.post("/breaches",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertGdprDataBreachSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const breach = await ukComplianceService.reportDataBreach(parsed.data);
    res.status(201).json(breach);
  })
);

router.put("/breaches/:id",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const breach = await ukComplianceService.updateDataBreach(tenantId, req.params.id, req.body);
    if (!breach) {
      res.status(404).json({ error: "Breach not found" });
      return;
    }
    res.json(breach);
  })
);

router.get("/settings",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const settings = await ukComplianceService.getComplianceSettings(tenantId);
    res.json(settings || { message: "No UK compliance settings found" });
  })
);

router.post("/settings",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const parsed = insertUkComplianceSettingsSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors });
      return;
    }
    const settings = await ukComplianceService.createOrUpdateComplianceSettings(parsed.data);
    res.json(settings);
  })
);

export default router;
