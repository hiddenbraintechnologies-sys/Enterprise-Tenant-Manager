import { Router } from "express";
import sessionsRoutes from "./sessions";
import stepUpRoutes from "./step-up";
import auditRoutes from "./audit";

const router = Router();

router.use(sessionsRoutes);
router.use(stepUpRoutes);
router.use(auditRoutes);

export default router;
