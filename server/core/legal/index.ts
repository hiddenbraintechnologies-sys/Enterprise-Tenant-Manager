import { Router } from "express";
import { legalClientsRouter } from "./clients";
import { casesRouter } from "./cases";
import { legalAppointmentsRouter } from "./appointments";
import { legalDocumentsRouter } from "./documents";
import { legalInvoicesRouter } from "./invoices";
import { caseSummarizationRouter } from "./case-summarization-routes";

export const legalRouter = Router();

legalRouter.use("/clients", legalClientsRouter);
legalRouter.use("/cases", casesRouter);
legalRouter.use("/appointments", legalAppointmentsRouter);
legalRouter.use("/documents", legalDocumentsRouter);
legalRouter.use("/invoices", legalInvoicesRouter);
legalRouter.use("/ai", caseSummarizationRouter);

export { legalClientsRouter, casesRouter, legalAppointmentsRouter, legalDocumentsRouter, legalInvoicesRouter, caseSummarizationRouter };
