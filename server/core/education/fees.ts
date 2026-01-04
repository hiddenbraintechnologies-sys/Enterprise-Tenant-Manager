import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { fees, feePayments, insertFeeSchema, insertFeePaymentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const feesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "dueDate", "status", "totalAmount"]).default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  studentId: z.string().optional(),
  status: z.string().optional(),
  feeType: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

feesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, studentId, status, feeType } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(fees.tenantId, tenantId), isNull(fees.deletedAt)];

    if (studentId) {
      conditions.push(eq(fees.studentId, studentId));
    }

    if (status) {
      conditions.push(eq(fees.status, status as any));
    }

    if (feeType) {
      conditions.push(eq(fees.feeType, feeType));
    }

    const orderColumn = {
      createdAt: fees.createdAt,
      dueDate: fees.dueDate,
      status: fees.status,
      totalAmount: fees.totalAmount,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(fees)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(fees)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

feesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [fee] = await db.select()
      .from(fees)
      .where(and(eq(fees.id, id), eq(fees.tenantId, isolation.getTenantId()), isNull(fees.deletedAt)));

    if (!fee) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    res.json(fee);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

feesRouter.get("/:id/payments", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const payments = await db.select()
      .from(feePayments)
      .where(and(eq(feePayments.feeId, id), eq(feePayments.tenantId, isolation.getTenantId())));

    res.json(payments);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

feesRouter.post("/", ...middleware, requirePermission("fees:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertFeeSchema.safeParse({
      ...req.body,
      tenantId,
      createdBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [fee] = await db.insert(fees).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "fee",
      resourceId: fee.id,
      metadata: { studentId: fee.studentId, amount: fee.totalAmount },
    });

    res.status(201).json(fee);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

feesRouter.post("/:id/payments", ...middleware, requirePermission("fees:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { id } = req.params;

    const parsed = insertFeePaymentSchema.safeParse({
      ...req.body,
      feeId: id,
      tenantId,
      receivedBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [payment] = await db.insert(feePayments).values(parsed.data).returning();

    const [fee] = await db.select().from(fees).where(eq(fees.id, id));
    if (fee) {
      const paidAmount = parseFloat(fee.paidAmount || "0") + parseFloat(payment.amount || "0");
      const totalAmount = parseFloat(fee.totalAmount || "0");
      const newStatus = paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partial" : fee.status;
      
      await db.update(fees)
        .set({ paidAmount: paidAmount.toString(), status: newStatus as any, updatedAt: new Date() })
        .where(eq(fees.id, id));
    }

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "fee_payment",
      resourceId: payment.id,
      metadata: { feeId: id, amount: payment.amount },
    });

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

feesRouter.patch("/:id", ...middleware, requirePermission("fees:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(fees)
      .where(and(eq(fees.id, id), eq(fees.tenantId, isolation.getTenantId()), isNull(fees.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    const updateSchema = insertFeeSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(fees)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(fees.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "fee",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

feesRouter.delete("/:id", ...middleware, requirePermission("fees:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(fees)
      .where(and(eq(fees.id, id), eq(fees.tenantId, isolation.getTenantId()), isNull(fees.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    await db.update(fees).set({ deletedAt: new Date() }).where(eq(fees.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "fee",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
