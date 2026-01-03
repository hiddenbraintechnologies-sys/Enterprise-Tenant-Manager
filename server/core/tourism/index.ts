import { Router } from "express";
import { packagesRouter } from "./packages";
import { bookingsRouter } from "./bookings";
import { itinerariesRouter } from "./itineraries";
import { vendorsRouter } from "./vendors";
import { travelersRouter } from "./travelers";

export const tourismRouter = Router();

tourismRouter.use("/packages", packagesRouter);
tourismRouter.use("/bookings", bookingsRouter);
tourismRouter.use("/itineraries", itinerariesRouter);
tourismRouter.use("/vendors", vendorsRouter);
tourismRouter.use("/travelers", travelersRouter);

export { packagesRouter, bookingsRouter, itinerariesRouter, vendorsRouter, travelersRouter };
