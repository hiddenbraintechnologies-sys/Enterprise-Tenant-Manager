/**
 * Query Optimizer Utilities
 * 
 * Provides optimized query patterns for Drizzle ORM.
 */

import { db } from '../db';
import { SQL, sql, eq, and, inArray, desc, asc } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { cache, cacheKeys, cacheTTL } from './cache';
import { trackDbTime } from '../middleware/response-time';
import { Request } from 'express';

/**
 * Execute a query with timing and optional caching
 */
export async function timedQuery<T>(
  queryFn: () => Promise<T>,
  req?: Request
): Promise<T> {
  const start = Date.now();
  try {
    return await queryFn();
  } finally {
    const duration = Date.now() - start;
    if (req) {
      trackDbTime(req, duration);
    }
  }
}

/**
 * Execute a cached query
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number = cacheTTL.medium,
  req?: Request
): Promise<T> {
  // Check cache first
  const cacheStart = Date.now();
  const cached = await cache.get<T>(cacheKey);
  
  if (cached !== null) {
    return cached;
  }

  // Execute query with timing
  const result = await timedQuery(queryFn, req);
  
  // Store in cache
  await cache.set(cacheKey, result, { ttl });
  
  return result;
}

/**
 * Batch load related entities (prevents N+1)
 */
export async function batchLoad<T, K extends string | number>(
  ids: K[],
  table: PgTable,
  idColumn: any,
  req?: Request
): Promise<Map<K, T>> {
  if (ids.length === 0) {
    return new Map();
  }

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(ids));

  const results = await timedQuery(
    () => db.select().from(table).where(inArray(idColumn, uniqueIds)),
    req
  );

  const map = new Map<K, T>();
  for (const result of results) {
    map.set((result as any).id, result as T);
  }

  return map;
}

/**
 * Optimized tenant-scoped query with caching
 */
export async function tenantQuery<T>(
  tenantId: string,
  table: PgTable,
  tenantIdColumn: any,
  additionalWhere?: SQL,
  cacheKey?: string,
  cacheTtl?: number
): Promise<T[]> {
  const queryFn = async () => {
    const query = db.select().from(table);
    
    if (additionalWhere) {
      return query.where(and(eq(tenantIdColumn, tenantId), additionalWhere)) as Promise<T[]>;
    }
    
    return query.where(eq(tenantIdColumn, tenantId)) as Promise<T[]>;
  };

  if (cacheKey) {
    return cachedQuery(cacheKey, queryFn, cacheTtl || cacheTTL.medium);
  }

  return queryFn();
}

/**
 * Select only needed fields (projection)
 */
export function selectFields<T extends Record<string, any>>(
  fields: (keyof T)[]
): Record<string, any> {
  const selection: Record<string, any> = {};
  for (const field of fields) {
    selection[field as string] = true;
  }
  return selection;
}

/**
 * Build efficient WHERE clause for multi-tenant queries
 */
export function tenantWhere(
  tenantIdColumn: any,
  tenantId: string,
  additionalConditions?: SQL[]
): SQL {
  const conditions = [eq(tenantIdColumn, tenantId)];
  
  if (additionalConditions) {
    conditions.push(...additionalConditions);
  }

  return and(...conditions) as SQL;
}

/**
 * Invalidate cache for a tenant
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  await Promise.all([
    cache.delPattern(`tenant:${tenantId}:*`),
    cache.delPattern(`dashboard:${tenantId}:*`),
    cache.delPattern(`analytics:${tenantId}:*`),
  ]);
}

/**
 * Invalidate cache for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cache.delPattern(`user:${userId}:*`);
}

/**
 * Optimized count query
 */
export async function countQuery(
  table: PgTable,
  whereClause?: SQL,
  req?: Request
): Promise<number> {
  const result = await timedQuery(async () => {
    const query = db.select({ count: sql<number>`count(*)` }).from(table);
    
    if (whereClause) {
      return (query as any).where(whereClause);
    }
    
    return query;
  }, req);

  return Number(result[0]?.count ?? 0);
}

/**
 * Exists check (more efficient than count)
 */
export async function existsQuery(
  table: PgTable,
  whereClause: SQL,
  req?: Request
): Promise<boolean> {
  const result = await timedQuery(async () => {
    return db
      .select({ exists: sql<boolean>`1` })
      .from(table)
      .where(whereClause)
      .limit(1);
  }, req);

  return result.length > 0;
}
