/**
 * Mobile API Module
 * 
 * Exports all mobile-specific API functionality including
 * authentication, sync, and device management.
 */

export { default as mobileApiRouter } from './mobile-api';
export {
  // Token management
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  
  // Middleware
  mobileAuthMiddleware,
  apiVersionMiddleware,
  createRateLimiter,
  mobileErrorHandler,
  
  // Sync
  SyncManager,
  
  // Error handling
  createApiError,
  ERROR_CODES,
  
  // Types
  type MobileDevice,
  type MobileSession,
  type MobileApiError,
  type SyncState,
  type PendingSync,
  type ApiVersion,
  API_VERSIONS,
} from './mobile-api';
