import { Router } from "express";
import { tenantIsolationMiddleware } from "../../core/tenant-isolation";
import { requireMinimumRole } from "../../core/auth-middleware";
import { auditService } from "../../core/audit";
import EmployeeService from "../../services/hrms/employeeService";

const router = Router();

router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("staff"));

router.get("/dashboard", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "hr_dashboard",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const stats = await EmployeeService.getDashboardStats(tenantId);
  res.json(stats);
});

router.get("/employees", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "employees",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const filters = {
    status: req.query.status as string,
    departmentId: req.query.departmentId as string,
    employmentType: req.query.employmentType as string,
    search: req.query.search as string,
  };
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  
  const employees = await EmployeeService.getEmployees(tenantId, filters, pagination);
  res.json(employees);
});

router.get("/employees/:id", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const employee = await EmployeeService.getEmployeeById(tenantId, req.params.id);
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "employees",
    resourceId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json(employee);
});

router.post("/employees", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const employee = await EmployeeService.createEmployee(req.body, tenantId, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "employees",
    resourceId: employee.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(employee);
});

router.patch("/employees/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const oldEmployee = await EmployeeService.getEmployeeById(tenantId, req.params.id);
  const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body, userId);
  
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "update",
    resource: "employees",
    resourceId: req.params.id,
    oldValue: oldEmployee,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json(employee);
});

router.delete("/employees/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const oldEmployee = await EmployeeService.getEmployeeById(tenantId, req.params.id);
  if (!oldEmployee) {
    return res.status(404).json({ error: "Employee not found" });
  }
  
  await EmployeeService.deleteEmployee(tenantId, req.params.id);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "delete",
    resource: "employees",
    resourceId: req.params.id,
    oldValue: oldEmployee,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json({ success: true });
});

router.get("/departments", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const departments = await EmployeeService.getDepartments(tenantId);
  res.json(departments);
});

router.post("/departments", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const department = await EmployeeService.createDepartment(req.body, tenantId, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "departments",
    resourceId: department.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(department);
});

export default router;
