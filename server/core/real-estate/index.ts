import { Router } from "express";
import { propertiesRouter } from "./properties";
import { listingsRouter } from "./listings";
import { leadsRouter } from "./leads";
import { siteVisitsRouter } from "./site-visits";
import { agentsRouter } from "./agents";
import { commissionsRouter } from "./commissions";

export const realEstateRouter = Router();

realEstateRouter.use("/properties", propertiesRouter);
realEstateRouter.use("/listings", listingsRouter);
realEstateRouter.use("/leads", leadsRouter);
realEstateRouter.use("/site-visits", siteVisitsRouter);
realEstateRouter.use("/agents", agentsRouter);
realEstateRouter.use("/commissions", commissionsRouter);

export { propertiesRouter, listingsRouter, leadsRouter, siteVisitsRouter, agentsRouter, commissionsRouter };
