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
  
  const employees = await EmployeeService.listEmployees(tenantId, req.query);
  res.json(employees);
});

router.get("/employees/:id", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const employee = await EmployeeService.getEmployee(tenantId, req.params.id);
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }
  res.json(employee);
});

router.post("/employees", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "employees",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const employee = await EmployeeService.addEmployee(tenantId, req.body);
  res.status(201).json(employee);
});

router.put("/employees/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "update",
    resource: "employees",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body);
  res.json(employee);
});

router.delete("/employees/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "delete",
    resource: "employees",
    resourceId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  await EmployeeService.deleteEmployee(tenantId, req.params.id);
  res.json({ success: true });
});

router.get("/departments", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const departments = await EmployeeService.listDepartments(tenantId);
  res.json(departments);
});

router.post("/departments", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "departments",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const department = await EmployeeService.addDepartment(tenantId, req.body);
  res.status(201).json(department);
});

export default router;
