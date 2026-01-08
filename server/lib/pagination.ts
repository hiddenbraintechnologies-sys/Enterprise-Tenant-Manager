/**
 * Pagination Utility
 * 
 * Provides consistent pagination for all list endpoints.
 */

import { Request } from 'express';
import { SQL, sql, count, asc, desc } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationOptions {
  maxLimit?: number;
  defaultLimit?: number;
}

/**
 * Extract pagination parameters from request query
 */
export function getPaginationParams(
  req: Request, 
  options: PaginationOptions = {}
): PaginationParams {
  const { maxLimit = 100, defaultLimit = 20 } = options;

  let page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || defaultLimit;

  // Validate and clamp values
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), maxLimit);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Execute a paginated query
 */
export async function paginatedQuery<T extends Record<string, unknown>>(
  table: PgTable,
  params: PaginationParams,
  whereClause?: SQL,
  orderBy?: SQL
): Promise<PaginatedResult<T>> {
  // Build count query
  const countQuery = db
    .select({ count: count() })
    .from(table);

  if (whereClause) {
    (countQuery as any).where(whereClause);
  }

  // Build data query
  const dataQuery = db
    .select()
    .from(table)
    .limit(params.limit)
    .offset(params.offset);

  if (whereClause) {
    (dataQuery as any).where(whereClause);
  }

  if (orderBy) {
    (dataQuery as any).orderBy(orderBy);
  }

  // Execute both queries in parallel
  const [countResult, data] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  const total = countResult[0]?.count ?? 0;

  return paginatedResponse(data as T[], Number(total), params);
}

/**
 * Cursor-based pagination for large datasets
 */
export interface CursorParams {
  cursor?: string;
  limit: number;
  direction: 'next' | 'prev';
}

export interface CursorResult<T> {
  data: T[];
  cursors: {
    next: string | null;
    prev: string | null;
  };
  hasMore: boolean;
}

export function getCursorParams(req: Request, defaultLimit = 20): CursorParams {
  return {
    cursor: req.query.cursor as string | undefined,
    limit: Math.min(parseInt(req.query.limit as string) || defaultLimit, 100),
    direction: (req.query.direction as 'next' | 'prev') || 'next',
  };
}

/**
 * Create cursor from an item (typically using ID or timestamp)
 */
export function createCursor(item: { id: string; createdAt?: Date }): string {
  const data = {
    id: item.id,
    ts: item.createdAt?.toISOString(),
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Parse a cursor back to its components
 */
export function parseCursor(cursor: string): { id: string; ts?: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function getSortParams(req: Request, allowedFields: string[] = ['createdAt']): SortParams {
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  
  return {
    sortBy: allowedFields.includes(sortBy) ? sortBy : 'createdAt',
    sortOrder,
  };
}

export interface FilterParams {
  status?: string;
  productType?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export function getFilterParams(req: Request): FilterParams {
  const filters: FilterParams = {};
  
  if (req.query.status) {
    filters.status = req.query.status as string;
  }
  if (req.query.productType) {
    filters.productType = req.query.productType as string;
  }
  if (req.query.startDate) {
    const date = new Date(req.query.startDate as string);
    if (!isNaN(date.getTime())) {
      filters.startDate = date;
    }
  }
  if (req.query.endDate) {
    const date = new Date(req.query.endDate as string);
    if (!isNaN(date.getTime())) {
      filters.endDate = date;
    }
  }
  if (req.query.search) {
    filters.search = req.query.search as string;
  }
  
  return filters;
}

export type ColumnMap = Record<string, PgColumn>;

export function buildOrderBy(
  sortParams: SortParams,
  columnMap: ColumnMap,
  defaultColumn: PgColumn
): SQL {
  const column = columnMap[sortParams.sortBy] || defaultColumn;
  return sortParams.sortOrder === 'asc' ? asc(column) : desc(column);
}

export interface EnhancedPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function parseEnhancedPaginationParams(req: Request, allowedSortFields: string[] = ['createdAt']): EnhancedPaginationOptions & PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' as const : 'desc' as const;
  
  return {
    page,
    limit,
    offset,
    sortBy: allowedSortFields.includes(sortBy) ? sortBy : 'createdAt',
    sortOrder,
  };
}
