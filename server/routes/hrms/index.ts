import { Router } from "express";
import { registerEmployeeRoutes } from "./employees";
import { registerAttendanceRoutes } from "./attendance";
import { registerLeaveRoutes } from "./leaves";
import { registerPayrollRoutes } from "./payroll";
import { registerProjectRoutes } from "./projects";

const router = Router();

registerEmployeeRoutes(router);
registerAttendanceRoutes(router);
registerLeaveRoutes(router);
registerPayrollRoutes(router);
registerProjectRoutes(router);

export { FEATURE_FLAGS, hasFeatureFlag, requireFeature } from "./shared";
export default router;
