import { Router, Request, Response } from "express";
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

const router = Router();

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
    return res.status(400).json({ error: "VAT number is required" });
  }
  res.json(ukComplianceService.validateVatNumber(vatNumber));
});

router.post("/vat/calculate", (req: Request, res: Response) => {
  const { netAmount, rateType, isReverseCharge, isEcSupply } = req.body;
  if (typeof netAmount !== "number") {
    return res.status(400).json({ error: "Net amount is required" });
  }
  res.json(ukComplianceService.calculateVat(netAmount, rateType, { isReverseCharge, isEcSupply }));
});

router.get("/vat/configuration", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const config = await ukComplianceService.getVatConfiguration(tenantId);
    res.json(config || { message: "No VAT configuration found" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/vat/configuration", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertUkVatConfigurationSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const config = await ukComplianceService.createVatConfiguration(parsed.data);
    res.status(201).json(config);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/vat/configuration", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const config = await ukComplianceService.updateVatConfiguration(tenantId, req.body);
    res.json(config);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/vat/invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const { status } = req.query;
    const invoices = await ukComplianceService.getVatInvoices(tenantId, { status: status as string });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/vat/invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertUkVatInvoiceSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const invoice = await ukComplianceService.createVatInvoice(parsed.data);
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/vat/invoices/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const invoice = await ukComplianceService.getVatInvoice(tenantId, req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/consent", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const { dataSubjectId, consentType } = req.query;
    const records = await ukComplianceService.getConsentRecords(tenantId, {
      dataSubjectId: dataSubjectId as string,
      consentType: consentType as string,
    });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/consent", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertGdprConsentRecordSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const record = await ukComplianceService.recordConsent(parsed.data);
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/consent/:id/withdraw", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const { reason } = req.body;
    const record = await ukComplianceService.withdrawConsent(tenantId, req.params.id, reason);
    if (!record) {
      return res.status(404).json({ error: "Consent record not found" });
    }
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/consent/active/:dataSubjectId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const records = await ukComplianceService.getActiveConsents(tenantId, req.params.dataSubjectId);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/retention-policies", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const policies = await ukComplianceService.getRetentionPolicies(tenantId);
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/retention-policies", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertUkDataRetentionPolicySchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const policy = await ukComplianceService.createRetentionPolicy(parsed.data);
    res.status(201).json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/retention-policies/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const policy = await ukComplianceService.updateRetentionPolicy(tenantId, req.params.id, req.body);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }
    res.json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/retention-logs", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const { policyId, action } = req.query;
    const logs = await ukComplianceService.getRetentionLogs(tenantId, {
      policyId: policyId as string,
      action: action as string,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/retention-logs", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertUkDataRetentionLogSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const log = await ukComplianceService.logRetentionAction(parsed.data);
    res.status(201).json(log);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/dsar", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const { status, requestType } = req.query;
    const requests = await ukComplianceService.getDsarRequests(tenantId, {
      status: status as string,
      requestType: requestType as string,
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/dsar", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertGdprDsarRequestSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const request = await ukComplianceService.createDsarRequest(parsed.data);
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/dsar/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const request = await ukComplianceService.getDsarRequest(tenantId, req.params.id);
    if (!request) {
      return res.status(404).json({ error: "DSAR request not found" });
    }
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/dsar/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const request = await ukComplianceService.updateDsarRequest(tenantId, req.params.id, req.body);
    if (!request) {
      return res.status(404).json({ error: "DSAR request not found" });
    }
    res.json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/breach/assess", (req: Request, res: Response) => {
  const { dataTypesAffected, dataSubjectsAffected, breachType } = req.body;
  if (!breachType) {
    return res.status(400).json({ error: "Breach type is required" });
  }
  const assessment = ukComplianceService.assessBreachSeverity({
    dataTypesAffected: dataTypesAffected || [],
    dataSubjectsAffected: dataSubjectsAffected || 0,
    breachType,
  });
  res.json(assessment);
});

router.get("/breaches", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const { status, severity } = req.query;
    const breaches = await ukComplianceService.getDataBreaches(tenantId, {
      status: status as string,
      severity: severity as string,
    });
    res.json(breaches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/breaches", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertGdprDataBreachSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const breach = await ukComplianceService.reportDataBreach(parsed.data);
    res.status(201).json(breach);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/breaches/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const breach = await ukComplianceService.updateDataBreach(tenantId, req.params.id, req.body);
    if (!breach) {
      return res.status(404).json({ error: "Breach not found" });
    }
    res.json(breach);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/settings", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const settings = await ukComplianceService.getComplianceSettings(tenantId);
    res.json(settings || { message: "No UK compliance settings found" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/settings", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string || "default";
    const parsed = insertUkComplianceSettingsSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const settings = await ukComplianceService.createOrUpdateComplianceSettings(parsed.data);
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
