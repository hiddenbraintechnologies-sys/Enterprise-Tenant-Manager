import { Router } from "express";
import sessionsRoutes from "./sessions";
import stepUpRoutes from "./step-up";
import auditRoutes from "./audit";
import impersonationRoutes from "./impersonation";
import cspReportRoutes from "./csp-report";

const router = Router();

router.use(sessionsRoutes);
router.use(stepUpRoutes);
router.use(auditRoutes);
router.use(impersonationRoutes);
router.use(cspReportRoutes);

export default router;
