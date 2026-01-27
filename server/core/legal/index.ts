import { Router, type Request, type Response } from "express";
import { legalClientsRouter } from "./clients";
import { casesRouter } from "./cases";
import { legalAppointmentsRouter } from "./appointments";
import { legalDocumentsRouter } from "./documents";
import { legalInvoicesRouter } from "./invoices";
import { caseSummarizationRouter } from "./case-summarization-routes";
import { db } from "../../db";
import { legalClients, cases, legalAppointments, legalInvoices } from "@shared/schema";
import { eq, and, sql, gte, isNull } from "drizzle-orm";

export const legalRouter = Router();

legalRouter.get("/dashboard/stats", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [clientsResult, activeCasesResult, upcomingAppointmentsResult, pendingInvoicesResult, monthlyRevenueResult, casesWonResult, closedCasesResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalClients)
        .where(and(eq(legalClients.tenantId, tenantId), isNull(legalClients.deletedAt))),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(cases)
        .where(and(
          eq(cases.tenantId, tenantId),
          sql`${cases.status} IN ('open', 'in_progress')`,
          isNull(cases.deletedAt)
        )),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalAppointments)
        .where(and(
          eq(legalAppointments.tenantId, tenantId),
          sql`${legalAppointments.scheduledDate} >= ${now.toISOString()}`,
          isNull(legalAppointments.deletedAt)
        )),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalInvoices)
        .where(and(
          eq(legalInvoices.tenantId, tenantId),
          sql`${legalInvoices.status} = 'pending'`,
          isNull(legalInvoices.deletedAt)
        )),
      
      db.select({ total: sql<number>`COALESCE(SUM(total_amount), 0)::numeric` })
        .from(legalInvoices)
        .where(and(
          eq(legalInvoices.tenantId, tenantId),
          sql`${legalInvoices.status} = 'paid'`,
          sql`${legalInvoices.invoiceDate} >= ${startOfMonth.toISOString()}`,
          isNull(legalInvoices.deletedAt)
        )),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(cases)
        .where(and(
          eq(cases.tenantId, tenantId),
          sql`${cases.status} = 'won'`,
          isNull(cases.deletedAt)
        )),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(cases)
        .where(and(
          eq(cases.tenantId, tenantId),
          sql`${cases.status} IN ('closed', 'won', 'lost', 'settled')`,
          isNull(cases.deletedAt)
        )),
    ]);

    const closedCases = closedCasesResult[0]?.count || 0;
    const casesWon = casesWonResult[0]?.count || 0;
    const casesWonRate = closedCases > 0 ? Math.round((casesWon / closedCases) * 100) : 0;

    res.json({
      totalClients: clientsResult[0]?.count || 0,
      activeCases: activeCasesResult[0]?.count || 0,
      upcomingAppointments: upcomingAppointmentsResult[0]?.count || 0,
      pendingInvoices: pendingInvoicesResult[0]?.count || 0,
      monthlyRevenue: Number(monthlyRevenueResult[0]?.total) || 0,
      casesWonRate,
    });
  } catch (error) {
    console.error("[legal/dashboard/stats] Error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

legalRouter.use("/clients", legalClientsRouter);
legalRouter.use("/cases", casesRouter);
legalRouter.use("/appointments", legalAppointmentsRouter);
legalRouter.use("/documents", legalDocumentsRouter);
legalRouter.use("/invoices", legalInvoicesRouter);
legalRouter.use("/ai", caseSummarizationRouter);

export { legalClientsRouter, casesRouter, legalAppointmentsRouter, legalDocumentsRouter, legalInvoicesRouter, caseSummarizationRouter };
