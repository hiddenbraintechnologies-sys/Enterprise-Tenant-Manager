import { Router, Request, Response } from "express";
import { payrollService } from "../../services/hrms/payrollService";
import { getTenantId, getUserId, parsePagination } from "./shared";

export function registerPayrollRoutes(router: Router): void {
  router.get("/salary-structure/:employeeId", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const structure = await payrollService.getSalaryStructure(tenantId, req.params.employeeId);
      res.json(structure);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/salary-structure", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const structure = await payrollService.createSalaryStructure(req.body, tenantId, userId);
      res.status(201).json(structure);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/payroll", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const pagination = parsePagination(req);
      const filters = {
        employeeId: req.query.employeeId as string,
        month: req.query.month ? parseInt(req.query.month as string) : undefined,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        status: req.query.status as string,
      };
      const result = await payrollService.getPayroll(tenantId, filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/payroll", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const payroll = await payrollService.createPayroll(req.body, tenantId, userId);
      res.status(201).json(payroll);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/payroll/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const payroll = await payrollService.updatePayroll(tenantId, req.params.id, req.body, userId);
      if (!payroll) {
        return res.status(404).json({ error: "Payroll record not found" });
      }
      res.json(payroll);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
