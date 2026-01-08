import { Router } from "express";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import leavesRouter from "./leaves";
import payrollRouter from "./payroll";
import projectsRouter from "./projects";

const router = Router();

router.use(employeesRouter);
router.use(attendanceRouter);
router.use(leavesRouter);
router.use(payrollRouter);
router.use(projectsRouter);

export { FEATURE_FLAGS, requireFeature } from "./projects";
export default router;
