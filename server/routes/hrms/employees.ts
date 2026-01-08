import { Router } from "express";
import { tenantIsolationMiddleware, requireMinimumRole, auditService } from "../../core";
import EmployeeService from "../../services/hrms/employeeService";

const router = Router();
router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("hr"));

router.get("/dashboard", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_dashboard", req, "hr_dashboard");
  const stats = await EmployeeService.getDashboardStats(tenantId);
  res.json(stats);
});

router.get("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_employees", req, "employees");
  const employees = await EmployeeService.listEmployees(tenantId, req.query);
  res.json(employees);
});

router.get("/:id", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const employee = await EmployeeService.getEmployee(tenantId, req.params.id);
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }
  res.json(employee);
});

router.post("/", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_employee", req, "employees");
  const employee = await EmployeeService.addEmployee(tenantId, req.body);
  res.status(201).json(employee);
});

router.put("/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_employee", req, "employees");
  const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body);
  res.json(employee);
});

router.delete("/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("delete_employee", req, "employees");
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
  
  auditService.logFromRequest("add_department", req, "departments");
  const department = await EmployeeService.addDepartment(tenantId, req.body);
  res.status(201).json(department);
});

export default router;
