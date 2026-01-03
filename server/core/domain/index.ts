/**
 * Domain Module Index
 * 
 * Export domain management and resolution functionality.
 */

export { domainService, DomainService } from './domain-service';
export { 
  resolveTenantByDomain, 
  requireVerifiedDomain, 
  attachDomainBranding 
} from './domain-resolution-middleware';
export { default as domainRoutes } from './domain-routes';
export { sslService, SSLService } from './ssl-service';
export { domainVerificationService, DomainVerificationService } from './domain-verification-service';
export {
  securityHeaders,
  customDomainCORS,
  requestId,
  rateLimitHeaders,
  cacheControl,
  apiSecurityHeaders,
} from './security-headers-middleware';
