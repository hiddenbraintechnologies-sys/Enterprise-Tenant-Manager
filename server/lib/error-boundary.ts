/**
 * API Error Boundary
 * Catches unhandled errors and returns consistent error responses with correlation ID.
 */

import type { Request, Response, NextFunction } from "express";
import { getCorrelationId } from "./request-logger";

export interface ApiError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  correlationId: string;
  timestamp: string;
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * API error boundary middleware
 * Must be registered LAST in the middleware chain
 */
export function apiErrorBoundary(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const correlationId = getCorrelationId(req);
  const status = err.status || err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  // Log error with correlation ID for debugging
  console.error(`[error-boundary] [${correlationId}] ${err.name}: ${err.message}`);
  
  // In development, log full stack trace
  if (!isProduction && err.stack) {
    console.error(`[error-boundary] [${correlationId}] Stack:`, err.stack);
  }

  // Build error response
  const response: ErrorResponse = {
    error: status >= 500 ? "Internal Server Error" : err.name || "Error",
    message: isProduction && status >= 500 
      ? "An unexpected error occurred. Please try again later." 
      : err.message,
    code,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  res.status(status).json(response);
}

/**
 * Create a structured API error
 */
export function createApiError(
  message: string,
  status: number = 500,
  code: string = "INTERNAL_ERROR",
  details?: unknown
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Async handler wrapper that catches errors and forwards to error boundary
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response) {
  const correlationId = getCorrelationId(req);
  
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    code: "ROUTE_NOT_FOUND",
    correlationId,
    timestamp: new Date().toISOString(),
  });
}
