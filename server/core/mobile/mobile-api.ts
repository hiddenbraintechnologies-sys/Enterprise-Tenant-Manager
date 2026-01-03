/**
 * Mobile API Integration Layer
 * 
 * Provides JWT authentication, API versioning, rate limiting,
 * error handling, and sync strategy for mobile clients.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ==================== Types ====================

export interface MobileDevice {
  id: string;
  userId: string;
  tenantId: string;
  platform: 'ios' | 'android';
  deviceId: string;
  deviceName: string;
  pushToken: string | null;
  appVersion: string;
  osVersion: string;
  lastActiveAt: Date;
  createdAt: Date;
}

export interface MobileSession {
  id: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface SyncState {
  entity: string;
  lastSyncedAt: Date;
  serverVersion: number;
  checksum: string;
}

export interface PendingSync {
  id: string;
  deviceId: string;
  entity: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  clientTimestamp: number;
  serverTimestamp: number;
  status: 'pending' | 'processed' | 'conflict' | 'failed';
  conflictData?: any;
}

// ==================== JWT Configuration ====================

const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || process.env.SESSION_SECRET || 'access-secret',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || process.env.SESSION_SECRET || 'refresh-secret',
  accessTokenExpirySeconds: 15 * 60, // 15 minutes
  refreshTokenExpirySeconds: 30 * 24 * 60 * 60, // 30 days
  issuer: 'bizflow',
  audience: 'bizflow-mobile',
};

// ==================== Token Management ====================

interface TokenPayload {
  userId: string;
  tenantId: string;
  deviceId: string;
  role: string;
  permissions: string[];
  type: 'access' | 'refresh';
}

export function generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_CONFIG.accessTokenSecret,
    {
      expiresIn: JWT_CONFIG.accessTokenExpirySeconds,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }
  );
}

export function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_CONFIG.refreshTokenSecret,
    {
      expiresIn: JWT_CONFIG.refreshTokenExpirySeconds,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }) as TokenPayload;
    
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshTokenSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }) as TokenPayload;
    
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function generateTokenPair(payload: Omit<TokenPayload, 'type'>) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  const accessDecoded = jwt.decode(accessToken) as any;
  const refreshDecoded = jwt.decode(refreshToken) as any;
  
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(accessDecoded.exp * 1000),
    refreshTokenExpiresAt: new Date(refreshDecoded.exp * 1000),
    expiresIn: accessDecoded.exp - Math.floor(Date.now() / 1000),
  };
}

// ==================== Rate Limiting ====================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60000, maxRequests: 10, message: 'Too many auth attempts' },
  api: { windowMs: 60000, maxRequests: 100, message: 'API rate limit exceeded' },
  sync: { windowMs: 60000, maxRequests: 30, message: 'Sync rate limit exceeded' },
  upload: { windowMs: 60000, maxRequests: 10, message: 'Upload rate limit exceeded' },
};

export function createRateLimiter(type: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[type];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${type}:${req.ip}:${req.headers['x-device-id'] || 'unknown'}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + config.windowMs };
      rateLimitStore.set(key, entry);
    }
    
    entry.count++;
    
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);
    
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetIn.toString(),
    });
    
    if (entry.count > config.maxRequests) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: config.message,
        retryAfter: resetIn,
      });
    }
    
    next();
  };
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// ==================== Error Handling ====================

export interface MobileApiError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  httpStatus: number;
}

export const ERROR_CODES = {
  // Authentication errors (401)
  AUTH_INVALID_TOKEN: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid or expired token', retryable: false, httpStatus: 401 },
  AUTH_TOKEN_EXPIRED: { code: 'AUTH_TOKEN_EXPIRED', message: 'Token has expired', retryable: true, httpStatus: 401 },
  AUTH_REFRESH_FAILED: { code: 'AUTH_REFRESH_FAILED', message: 'Token refresh failed', retryable: false, httpStatus: 401 },
  AUTH_DEVICE_REVOKED: { code: 'AUTH_DEVICE_REVOKED', message: 'Device access revoked', retryable: false, httpStatus: 401 },
  
  // Authorization errors (403)
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Access denied', retryable: false, httpStatus: 403 },
  TENANT_ACCESS_DENIED: { code: 'TENANT_ACCESS_DENIED', message: 'Tenant access denied', retryable: false, httpStatus: 403 },
  
  // Validation errors (400)
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Validation failed', retryable: false, httpStatus: 400 },
  INVALID_REQUEST: { code: 'INVALID_REQUEST', message: 'Invalid request format', retryable: false, httpStatus: 400 },
  
  // Resource errors (404)
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', retryable: false, httpStatus: 404 },
  
  // Conflict errors (409)
  SYNC_CONFLICT: { code: 'SYNC_CONFLICT', message: 'Data sync conflict', retryable: true, httpStatus: 409 },
  VERSION_MISMATCH: { code: 'VERSION_MISMATCH', message: 'Version mismatch', retryable: true, httpStatus: 409 },
  
  // Rate limiting (429)
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Too many requests', retryable: true, httpStatus: 429 },
  
  // Server errors (500)
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', retryable: true, httpStatus: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable', retryable: true, httpStatus: 503 },
} as const;

export function createApiError(
  errorType: keyof typeof ERROR_CODES,
  details?: any
): MobileApiError {
  return {
    ...ERROR_CODES[errorType],
    details,
  };
}

export function mobileErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Mobile API Error:', error);
  
  // Already an API error
  if (error.code && error.httpStatus) {
    return res.status(error.httpStatus).json({
      error: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    });
  }
  
  // Zod validation error
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.errors,
      retryable: false,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: error.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_INVALID_TOKEN',
      message: error.message,
      retryable: error.name === 'TokenExpiredError',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    });
  }
  
  // Generic error
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    retryable: true,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
  });
}

// ==================== API Versioning ====================

export const API_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersion = typeof API_VERSIONS[number];

const CURRENT_VERSION: ApiVersion = 'v1';
const MIN_SUPPORTED_VERSION: ApiVersion = 'v1';

export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestedVersion = req.headers['x-api-version'] as ApiVersion || 
                           req.query.apiVersion as ApiVersion ||
                           CURRENT_VERSION;
  
  if (!API_VERSIONS.includes(requestedVersion)) {
    return res.status(400).json({
      error: 'INVALID_API_VERSION',
      message: `Invalid API version. Supported versions: ${API_VERSIONS.join(', ')}`,
      retryable: false,
    });
  }
  
  const versionIndex = API_VERSIONS.indexOf(requestedVersion);
  const minVersionIndex = API_VERSIONS.indexOf(MIN_SUPPORTED_VERSION);
  
  if (versionIndex < minVersionIndex) {
    return res.status(400).json({
      error: 'API_VERSION_DEPRECATED',
      message: `API version ${requestedVersion} is no longer supported. Minimum: ${MIN_SUPPORTED_VERSION}`,
      retryable: false,
      upgradeRequired: true,
      minimumVersion: MIN_SUPPORTED_VERSION,
      currentVersion: CURRENT_VERSION,
    });
  }
  
  req.apiVersion = requestedVersion;
  
  res.set({
    'X-API-Version': requestedVersion,
    'X-API-Current-Version': CURRENT_VERSION,
    'X-API-Min-Version': MIN_SUPPORTED_VERSION,
  });
  
  next();
}

// ==================== Mobile Auth Middleware ====================

export function mobileAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(createApiError('AUTH_INVALID_TOKEN'));
  }
  
  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return res.status(401).json(createApiError('AUTH_INVALID_TOKEN'));
  }
  
  req.mobileAuth = {
    userId: payload.userId,
    tenantId: payload.tenantId,
    deviceId: payload.deviceId,
    role: payload.role,
    permissions: payload.permissions,
  };
  
  next();
}

// ==================== Sync Strategy ====================

interface SyncRequest {
  entity: string;
  lastSyncedAt: string | null;
  clientVersion: number;
  pendingChanges: Array<{
    id: string;
    action: 'create' | 'update' | 'delete';
    data?: any;
    timestamp: number;
  }>;
}

interface SyncResponse {
  entity: string;
  serverVersion: number;
  syncedAt: string;
  changes: Array<{
    id: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }>;
  conflicts: Array<{
    clientChange: any;
    serverData: any;
    resolution: 'client_wins' | 'server_wins' | 'manual';
  }>;
  processed: string[];
  hasMore: boolean;
  nextCursor?: string;
}

// In-memory sync state store (replace with database in production)
const syncStateStore = new Map<string, SyncState>();
const pendingSyncStore = new Map<string, PendingSync[]>();

export class SyncManager {
  
  static async processSync(
    userId: string,
    tenantId: string,
    deviceId: string,
    request: SyncRequest
  ): Promise<SyncResponse> {
    const stateKey = `${tenantId}:${userId}:${request.entity}`;
    const currentState = syncStateStore.get(stateKey) || {
      entity: request.entity,
      lastSyncedAt: new Date(0),
      serverVersion: 0,
      checksum: '',
    };
    
    // Process pending changes from client
    const processed: string[] = [];
    const conflicts: SyncResponse['conflicts'] = [];
    
    for (const change of request.pendingChanges) {
      try {
        const result = await this.processChange(tenantId, request.entity, change, currentState);
        
        if (result.conflict) {
          conflicts.push({
            clientChange: change,
            serverData: result.serverData,
            resolution: this.resolveConflict(change, result.serverData),
          });
        } else {
          processed.push(change.id);
        }
      } catch (error) {
        console.error('Sync change processing error:', error);
      }
    }
    
    // Get server changes since last sync
    const serverChanges = await this.getServerChanges(
      tenantId,
      request.entity,
      request.lastSyncedAt ? new Date(request.lastSyncedAt) : new Date(0)
    );
    
    // Update sync state
    const newVersion = currentState.serverVersion + 1;
    const syncedAt = new Date();
    
    syncStateStore.set(stateKey, {
      entity: request.entity,
      lastSyncedAt: syncedAt,
      serverVersion: newVersion,
      checksum: this.computeChecksum(serverChanges),
    });
    
    return {
      entity: request.entity,
      serverVersion: newVersion,
      syncedAt: syncedAt.toISOString(),
      changes: serverChanges,
      conflicts,
      processed,
      hasMore: serverChanges.length >= 100,
      nextCursor: serverChanges.length >= 100 ? serverChanges[serverChanges.length - 1]?.id : undefined,
    };
  }
  
  private static async processChange(
    tenantId: string,
    entity: string,
    change: SyncRequest['pendingChanges'][0],
    currentState: SyncState
  ): Promise<{ conflict: boolean; serverData?: any }> {
    // Check for conflicts (simplified - would check against actual database)
    const serverData = null; // Would fetch from database
    
    if (serverData && change.action === 'update') {
      // Check if server data was modified after client's timestamp
      const serverModifiedAt = (serverData as any).updatedAt?.getTime() || 0;
      if (serverModifiedAt > change.timestamp) {
        return { conflict: true, serverData };
      }
    }
    
    // Process the change (would update database)
    // await database.processChange(tenantId, entity, change);
    
    return { conflict: false };
  }
  
  private static resolveConflict(
    clientChange: any,
    serverData: any
  ): 'client_wins' | 'server_wins' | 'manual' {
    // Last-write-wins strategy by default
    const clientTimestamp = clientChange.timestamp || 0;
    const serverTimestamp = serverData?.updatedAt?.getTime() || 0;
    
    if (clientTimestamp > serverTimestamp) {
      return 'client_wins';
    }
    
    return 'server_wins';
  }
  
  private static async getServerChanges(
    tenantId: string,
    entity: string,
    since: Date
  ): Promise<SyncResponse['changes']> {
    // Would fetch from database
    // return await database.getChanges(tenantId, entity, since);
    return [];
  }
  
  private static computeChecksum(data: any[]): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }
}

// ==================== Mobile API Routes ====================

const router = Router();

// Apply versioning to all routes
router.use(apiVersionMiddleware);

// ==================== Authentication Endpoints ====================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string(),
  deviceName: z.string(),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string(),
  osVersion: z.string().optional(),
});

router.post('/auth/login', createRateLimiter('auth'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    
    // Validate credentials (would check against database)
    // const user = await userService.validateCredentials(data.email, data.password);
    
    // Mock user for demonstration
    const user = {
      id: 'user-123',
      email: data.email,
      role: 'staff',
      permissions: ['read:customers', 'write:bookings'],
      tenants: [
        { id: 'tenant-1', name: 'Acme Salon', role: 'admin' },
        { id: 'tenant-2', name: 'City Gym', role: 'staff' },
      ],
    };
    
    // Generate tokens (using first tenant by default)
    const defaultTenant = user.tenants[0];
    const tokens = generateTokenPair({
      userId: user.id,
      tenantId: defaultTenant.id,
      deviceId: data.deviceId,
      role: defaultTenant.role,
      permissions: user.permissions,
    });
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tenants: user.tenants,
      currentTenant: defaultTenant,
      tokens,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/refresh', createRateLimiter('auth'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(createApiError('INVALID_REQUEST', { field: 'refreshToken' }));
    }
    
    const payload = verifyRefreshToken(refreshToken);
    
    if (!payload) {
      return res.status(401).json(createApiError('AUTH_REFRESH_FAILED'));
    }
    
    // Check if session is revoked (would check database)
    // const session = await sessionService.findByRefreshToken(refreshToken);
    // if (!session || session.isRevoked) { ... }
    
    const tokens = generateTokenPair({
      userId: payload.userId,
      tenantId: payload.tenantId,
      deviceId: payload.deviceId,
      role: payload.role,
      permissions: payload.permissions,
    });
    
    res.json({ tokens });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/logout', mobileAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId } = req.mobileAuth!;
    
    // Revoke session (would update database)
    // await sessionService.revokeByDeviceId(deviceId);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/switch-tenant', mobileAuthMiddleware, createRateLimiter('auth'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.body;
    const { userId, deviceId } = req.mobileAuth!;
    
    if (!tenantId) {
      return res.status(400).json(createApiError('INVALID_REQUEST', { field: 'tenantId' }));
    }
    
    // Verify user has access to tenant (would check database)
    // const membership = await tenantService.getMembership(userId, tenantId);
    
    // Mock tenant data
    const tenant = { id: tenantId, name: 'Switched Tenant', role: 'staff' };
    
    const tokens = generateTokenPair({
      userId,
      tenantId,
      deviceId,
      role: tenant.role,
      permissions: ['read:customers', 'write:bookings'],
    });
    
    res.json({
      tenant,
      tokens,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Device Management ====================

router.get('/devices', mobileAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.mobileAuth!;
    
    // Get user's devices (would fetch from database)
    const devices: Partial<MobileDevice>[] = [];
    
    res.json({ devices });
  } catch (error) {
    next(error);
  }
});

router.delete('/devices/:deviceId', mobileAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId } = req.params;
    const { userId } = req.mobileAuth!;
    
    // Revoke device (would update database)
    // await deviceService.revoke(userId, deviceId);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== Push Notifications ====================

const registerDeviceSchema = z.object({
  token: z.string(),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string(),
  deviceName: z.string(),
});

router.post('/notifications/devices', mobileAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerDeviceSchema.parse(req.body);
    const { userId, tenantId } = req.mobileAuth!;
    
    // Register push token (would save to database)
    // await notificationService.registerDevice(userId, tenantId, data);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/notifications/devices/:token', mobileAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { userId } = req.mobileAuth!;
    
    // Unregister push token (would delete from database)
    // await notificationService.unregisterDevice(userId, token);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== Sync Endpoints ====================

const syncRequestSchema = z.object({
  entity: z.string(),
  lastSyncedAt: z.string().nullable(),
  clientVersion: z.number(),
  pendingChanges: z.array(z.object({
    id: z.string(),
    action: z.enum(['create', 'update', 'delete']),
    data: z.any(),
    timestamp: z.number(),
  })),
});

router.post('/sync', mobileAuthMiddleware, createRateLimiter('sync'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = syncRequestSchema.parse(req.body);
    const { userId, tenantId, deviceId } = req.mobileAuth!;
    
    const result = await SyncManager.processSync(userId, tenantId, deviceId, data);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/sync/batch', mobileAuthMiddleware, createRateLimiter('sync'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entities } = req.body as { entities: SyncRequest[] };
    const { userId, tenantId, deviceId } = req.mobileAuth!;
    
    const results = await Promise.all(
      entities.map(entity => SyncManager.processSync(userId, tenantId, deviceId, entity))
    );
    
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

// ==================== Health & Status ====================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
  });
});

router.get('/config', (req: Request, res: Response) => {
  res.json({
    apiVersion: {
      current: CURRENT_VERSION,
      minimum: MIN_SUPPORTED_VERSION,
      supported: API_VERSIONS,
    },
    features: {
      offlineSync: true,
      pushNotifications: true,
      biometricAuth: true,
    },
    limits: {
      maxSyncBatchSize: 100,
      maxUploadSize: 10 * 1024 * 1024, // 10MB
      syncIntervalSeconds: 30,
    },
  });
});

// Apply error handler
router.use(mobileErrorHandler);

export default router;

// Type augmentation for Express
declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
      mobileAuth?: {
        userId: string;
        tenantId: string;
        deviceId: string;
        role: string;
        permissions: string[];
      };
    }
  }
}
