import { Router, Request, Response } from "express";
import { employeeService } from "../../services/hrms/employeeService";
import { getTenantId, getUserId, parsePagination } from "./shared";

export function registerEmployeeRoutes(router: Router): void {
  router.get("/dashboard", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const stats = await employeeService.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/employees", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const pagination = parsePagination(req);
      const filters = {
        status: req.query.status as string,
        departmentId: req.query.departmentId as string,
        employmentType: req.query.employmentType as string,
        search: req.query.search as string,
      };
      const result = await employeeService.getEmployees(tenantId, filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/employees/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const employee = await employeeService.getEmployeeById(tenantId, req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/employees", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const employee = await employeeService.createEmployee(req.body, tenantId, userId);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/employees/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const employee = await employeeService.updateEmployee(tenantId, req.params.id, req.body, userId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/departments", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const departments = await employeeService.getDepartments(tenantId);
      res.json(departments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/departments", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const department = await employeeService.createDepartment(req.body, tenantId, userId);
      res.status(201).json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
