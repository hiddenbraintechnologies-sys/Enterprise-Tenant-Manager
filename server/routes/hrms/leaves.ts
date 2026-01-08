import { Router, Request, Response } from "express";
import { leaveService } from "../../services/hrms/leaveService";
import { getTenantId, getUserId, parsePagination } from "./shared";

export function registerLeaveRoutes(router: Router): void {
  router.get("/leave-types", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const leaveTypes = await leaveService.getLeaveTypes(tenantId);
      res.json(leaveTypes);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/leave-types", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const leaveType = await leaveService.createLeaveType(req.body, tenantId, userId);
      res.status(201).json(leaveType);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/leave-balances/:employeeId", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const balances = await leaveService.getLeaveBalances(tenantId, req.params.employeeId, year);
      res.json(balances);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/leaves", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const pagination = parsePagination(req);
      const filters = {
        employeeId: req.query.employeeId as string,
        status: req.query.status as string,
        leaveTypeId: req.query.leaveTypeId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };
      const result = await leaveService.getLeaves(tenantId, filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/leaves", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const leave = await leaveService.createLeave(req.body, tenantId, userId);
      res.status(201).json(leave);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/leaves/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const leave = await leaveService.updateLeave(tenantId, req.params.id, req.body, userId);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      res.json(leave);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
