import { db } from "../db";
import { eq, and, SQL, desc, asc, isNull } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { TenantIsolationError } from "./tenant-isolation";

export interface ScopedQueryOptions {
  includeDeleted?: boolean;
  orderBy?: { column: PgColumn; direction: "asc" | "desc" };
  limit?: number;
  offset?: number;
}

export class TenantScopedRepository {
  protected tenantId: string;
  protected table: any;
  protected idColumn: PgColumn;
  protected tenantColumn: PgColumn;
  protected deletedAtColumn?: PgColumn;

  constructor(
    tenantId: string,
    table: any,
    options: {
      idColumn?: PgColumn;
      tenantColumn?: PgColumn;
      deletedAtColumn?: PgColumn;
    } = {}
  ) {
    if (!tenantId) {
      throw new TenantIsolationError("Tenant ID is required");
    }

    this.tenantId = tenantId;
    this.table = table;
    this.idColumn = options.idColumn || table.id;
    this.tenantColumn = options.tenantColumn || table.tenantId;
    this.deletedAtColumn = options.deletedAtColumn || table.deletedAt;
  }

  protected getTenantCondition(): SQL {
    return eq(this.tenantColumn, this.tenantId);
  }

  protected getActiveCondition(includeDeleted: boolean = false): SQL | undefined {
    if (includeDeleted || !this.deletedAtColumn) {
      return undefined;
    }
    return isNull(this.deletedAtColumn);
  }

  protected buildWhereConditions(
    additionalConditions: SQL[] = [],
    options: ScopedQueryOptions = {}
  ): SQL {
    const conditions: SQL[] = [this.getTenantCondition()];
    
    const activeCondition = this.getActiveCondition(options.includeDeleted);
    if (activeCondition) {
      conditions.push(activeCondition);
    }

    conditions.push(...additionalConditions);

    return and(...conditions)!;
  }

  async findAll(options: ScopedQueryOptions = {}): Promise<any[]> {
    let query = db.select()
      .from(this.table)
      .where(this.buildWhereConditions([], options));

    if (options.orderBy) {
      const orderFn = options.orderBy.direction === "desc" ? desc : asc;
      query = query.orderBy(orderFn(options.orderBy.column)) as any;
    }

    if (options.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options.offset) {
      query = query.offset(options.offset) as any;
    }

    return query;
  }

  async findById(id: string, options: ScopedQueryOptions = {}): Promise<any | null> {
    const [record] = await db.select()
      .from(this.table)
      .where(this.buildWhereConditions([eq(this.idColumn, id)], options))
      .limit(1);

    return record || null;
  }

  async findByIdOrFail(id: string, options: ScopedQueryOptions = {}): Promise<any> {
    const record = await this.findById(id, options);
    
    if (!record) {
      throw new TenantIsolationError("Record not found or access denied", 404);
    }

    return record;
  }

  async findOne(conditions: SQL[], options: ScopedQueryOptions = {}): Promise<any | null> {
    const [record] = await db.select()
      .from(this.table)
      .where(this.buildWhereConditions(conditions, options))
      .limit(1);

    return record || null;
  }

  async create(data: Record<string, any>): Promise<any> {
    const scopedData = {
      ...data,
      tenantId: this.tenantId,
    };

    const [created] = await db.insert(this.table)
      .values(scopedData)
      .returning();

    return created;
  }

  async update(id: string, data: Record<string, any>): Promise<any | null> {
    await this.findByIdOrFail(id);

    const [updated] = await db.update(this.table)
      .set(data)
      .where(and(
        eq(this.idColumn, id),
        this.getTenantCondition()
      ))
      .returning();

    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    await this.findByIdOrFail(id);

    await db.delete(this.table)
      .where(and(
        eq(this.idColumn, id),
        this.getTenantCondition()
      ));

    return true;
  }

  async softDelete(id: string): Promise<any | null> {
    if (!this.deletedAtColumn) {
      throw new Error("Soft delete not supported - no deletedAt column");
    }

    await this.findByIdOrFail(id);

    const [updated] = await db.update(this.table)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(this.idColumn, id),
        this.getTenantCondition()
      ))
      .returning();

    return updated || null;
  }

  async restore(id: string): Promise<any | null> {
    if (!this.deletedAtColumn) {
      throw new Error("Restore not supported - no deletedAt column");
    }

    const [record] = await db.select()
      .from(this.table)
      .where(and(
        eq(this.idColumn, id),
        this.getTenantCondition()
      ))
      .limit(1);

    if (!record) {
      throw new TenantIsolationError("Record not found", 404);
    }

    const [updated] = await db.update(this.table)
      .set({ deletedAt: null })
      .where(and(
        eq(this.idColumn, id),
        this.getTenantCondition()
      ))
      .returning();

    return updated || null;
  }

  async count(conditions: SQL[] = []): Promise<number> {
    const result = await db.select()
      .from(this.table)
      .where(this.buildWhereConditions(conditions));

    return result.length;
  }

  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id);
    return !!record;
  }

  validateOwnership(record: { tenantId?: string | null } | null | undefined): void {
    if (!record) {
      throw new TenantIsolationError("Record not found", 404);
    }
    
    if (record.tenantId !== this.tenantId) {
      throw new TenantIsolationError("Cross-tenant access denied", 403);
    }
  }
}

export function createScopedRepository(
  tenantId: string,
  table: any,
  options?: {
    idColumn?: PgColumn;
    tenantColumn?: PgColumn;
    deletedAtColumn?: PgColumn;
  }
): TenantScopedRepository {
  return new TenantScopedRepository(tenantId, table, options);
}

export function scopeInsertData<T extends Record<string, any>>(
  data: Omit<T, "tenantId">,
  tenantId: string
): T & { tenantId: string } {
  return {
    ...data,
    tenantId,
  } as T & { tenantId: string };
}

export function validateTenantMatch(
  expectedTenantId: string,
  record: { tenantId?: string | null } | null | undefined
): void {
  if (!record) {
    throw new TenantIsolationError("Record not found", 404);
  }
  
  if (record.tenantId !== expectedTenantId) {
    throw new TenantIsolationError("Cross-tenant access denied", 403);
  }
}

export function assertRecordBelongsToTenant(
  record: { tenantId?: string | null } | null,
  expectedTenantId: string,
  resourceName: string = "Record"
): asserts record is NonNullable<typeof record> {
  if (!record) {
    throw new TenantIsolationError(`${resourceName} not found`, 404);
  }
  
  if (record.tenantId !== expectedTenantId) {
    throw new TenantIsolationError(`${resourceName} access denied`, 403);
  }
}

export interface TenantScopedData {
  tenantId: string;
}

export function ensureTenantId<T extends Partial<TenantScopedData>>(
  data: T,
  tenantId: string
): T & TenantScopedData {
  if (data.tenantId && data.tenantId !== tenantId) {
    throw new TenantIsolationError("Cannot set tenantId to a different tenant");
  }
  
  return {
    ...data,
    tenantId,
  };
}
