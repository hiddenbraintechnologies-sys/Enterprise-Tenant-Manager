import { Router } from "express";
import { vehiclesRouter } from "./vehicles";
import { driversRouter } from "./drivers";
import { tripsRouter } from "./trips";
import { shipmentsRouter } from "./shipments";
import { maintenanceRouter } from "./maintenance";
import { routeOptimizationRouter } from "./route-optimization-routes";

export const logisticsRouter = Router();

logisticsRouter.use("/vehicles", vehiclesRouter);
logisticsRouter.use("/drivers", driversRouter);
logisticsRouter.use("/trips", tripsRouter);
logisticsRouter.use("/shipments", shipmentsRouter);
logisticsRouter.use("/maintenance", maintenanceRouter);
logisticsRouter.use("/route-optimizer", routeOptimizationRouter);

export { vehiclesRouter, driversRouter, tripsRouter, shipmentsRouter, maintenanceRouter, routeOptimizationRouter };
