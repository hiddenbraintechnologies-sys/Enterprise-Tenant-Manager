import { Router, Request, Response, NextFunction } from "express";
import { uaeComplianceService } from "./uae-compliance-service";
import { authenticateJWT } from "../auth-middleware";
import { tenantIsolationMiddleware } from "../tenant-isolation";

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const getTenantId = (req: Request): string | undefined => {
  return (req as any).context?.tenant?.id;
};
import {
  insertUaeVatConfigurationSchema,
  insertUaeVatInvoiceSchema,
  insertTraTemplateSchema,
  insertDataResidencyLogSchema,
  insertUaeComplianceSettingsSchema,
} from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/emirates", (_req: Request, res: Response) => {
  res.json(uaeComplianceService.getEmirates());
});

router.get("/free-zones", (_req: Request, res: Response) => {
  res.json(uaeComplianceService.getFreeZones());
});

router.get("/checklist", (_req: Request, res: Response) => {
  res.json(uaeComplianceService.getUaeComplianceChecklist());
});

router.post("/vat/validate-trn", (req: Request, res: Response) => {
  try {
    const { trn } = req.body;
    if (!trn) {
      return res.status(400).json({ error: "TRN is required" });
    }
    const result = uaeComplianceService.validateTrn(trn);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/vat/calculate", (req: Request, res: Response) => {
  try {
    const { amount, vatRate, isZeroRated, isExempt, isReverseCharge } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ error: "Amount is required" });
    }
    const result = uaeComplianceService.calculateVat(amount, vatRate, {
      isZeroRated,
      isExempt,
      isReverseCharge,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/vat/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const config = await uaeComplianceService.getVatConfiguration(tenantId);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  "/vat/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const data = insertUaeVatConfigurationSchema.parse({ ...req.body, tenantId });
      const config = await uaeComplianceService.createVatConfiguration(data);
      res.status(201).json(config);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/vat/configuration",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const config = await uaeComplianceService.updateVatConfiguration(tenantId, req.body);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/vat/invoices",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const { status, fromDate, toDate } = req.query;
      const invoices = await uaeComplianceService.getVatInvoices(tenantId, {
        status: status as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  "/vat/invoices",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const data = insertUaeVatInvoiceSchema.parse({ ...req.body, tenantId });
      const invoice = await uaeComplianceService.createVatInvoice(data);
      res.status(201).json(invoice);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/vat/invoices/:invoiceId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const invoice = await uaeComplianceService.getVatInvoice(tenantId, req.params.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/tra/templates",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const { category } = req.query;
      const templates = await uaeComplianceService.getTraTemplates(tenantId, category as string);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  "/tra/templates",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const data = insertTraTemplateSchema.parse({ ...req.body, tenantId });
      const template = await uaeComplianceService.registerTraTemplate(data);
      res.status(201).json(template);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/tra/templates/:templateId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const template = await uaeComplianceService.updateTraTemplate(tenantId, req.params.templateId, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/tra/validate-sender-id", (req: Request, res: Response) => {
  try {
    const { senderId } = req.body;
    if (!senderId) {
      return res.status(400).json({ error: "Sender ID is required" });
    }
    const valid = uaeComplianceService.validateTraSenderId(senderId);
    res.json({ valid, senderId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/data-residency/logs",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const { dataType, storageLocation } = req.query;
      const logs = await uaeComplianceService.getDataResidencyLogs(tenantId, {
        dataType: dataType as string,
        storageLocation: storageLocation as string,
      });
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  "/data-residency/logs",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const data = insertDataResidencyLogSchema.parse({ ...req.body, tenantId });
      const log = await uaeComplianceService.logDataResidency(data);
      res.status(201).json(log);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/data-residency/check-compliance", (req: Request, res: Response) => {
  try {
    const { dataType, storageLocation, isUaeResident } = req.body;
    if (!dataType || !storageLocation) {
      return res.status(400).json({ error: "dataType and storageLocation are required" });
    }
    const result = uaeComplianceService.checkDataResidencyCompliance(
      dataType,
      storageLocation,
      isUaeResident ?? true
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/settings",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const settings = await uaeComplianceService.getComplianceSettings(tenantId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  "/settings",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const data = insertUaeComplianceSettingsSchema.parse({ ...req.body, tenantId });
      const settings = await uaeComplianceService.createOrUpdateComplianceSettings(data);
      res.status(201).json(settings);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/emirates-id/validate", (req: Request, res: Response) => {
  try {
    const { emiratesId } = req.body;
    if (!emiratesId) {
      return res.status(400).json({ error: "Emirates ID is required" });
    }
    const result = uaeComplianceService.validateEmiratesId(emiratesId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/emirates-id/mask", (req: Request, res: Response) => {
  try {
    const { emiratesId } = req.body;
    if (!emiratesId) {
      return res.status(400).json({ error: "Emirates ID is required" });
    }
    const masked = uaeComplianceService.maskEmiratesId(emiratesId);
    res.json({ masked });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/translate", (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    const result = uaeComplianceService.translateToArabic(text);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
