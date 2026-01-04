import { Router } from "express";
import { vehiclesRouter } from "./vehicles";
import { driversRouter } from "./drivers";
import { tripsRouter } from "./trips";
import { shipmentsRouter } from "./shipments";
import { maintenanceRouter } from "./maintenance";

export const logisticsRouter = Router();

logisticsRouter.use("/vehicles", vehiclesRouter);
logisticsRouter.use("/drivers", driversRouter);
logisticsRouter.use("/trips", tripsRouter);
logisticsRouter.use("/shipments", shipmentsRouter);
logisticsRouter.use("/maintenance", maintenanceRouter);

export { vehiclesRouter, driversRouter, tripsRouter, shipmentsRouter, maintenanceRouter };
