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
