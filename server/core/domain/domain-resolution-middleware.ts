/**
 * Domain Resolution Middleware
 * 
 * Resolves tenant from request hostname for white-label domain support.
 */

import { Request, Response, NextFunction } from 'express';
import { domainService } from './domain-service';
import { tenantBrandingService as brandingService } from '../branding';

// Default domain patterns that should use slug/session resolution
const DEFAULT_DOMAIN_PATTERNS = [
  /^localhost(:\d+)?$/,
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /\.repl\.co$/,
  /^127\.0\.0\.1(:\d+)?$/,
  /^0\.0\.0\.0(:\d+)?$/,
];

// Suspicious host patterns that could indicate host header attacks
const SUSPICIOUS_PATTERNS = [
  /[<>'"]/,           // Script injection attempts
  /\s/,               // Whitespace
  /\.\.+/,            // Multiple dots
  /[@#$%^&*()]/,      // Special characters
];

interface DomainResolutionOptions {
  enforceHttps?: boolean;
  defaultTenantSlug?: string;
}

/**
 * Extract hostname from request
 */
function extractHostname(req: Request): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost) {
    return Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  }
  const host = req.headers.host || '';
  return host.split(':')[0].toLowerCase();
}

/**
 * Check if request is HTTPS
 */
function isHttps(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto) {
    return forwardedProto === 'https';
  }
  return req.secure;
}

/**
 * Check if hostname matches default domain patterns
 */
function isDefaultDomain(hostname: string): boolean {
  return DEFAULT_DOMAIN_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Check if hostname looks suspicious
 */
function isSuspiciousHost(hostname: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Domain resolution middleware
 */
export function resolveTenantByDomain(options: DomainResolutionOptions = {}) {
  const { enforceHttps = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hostname = extractHostname(req);

      // Security: Check for suspicious host headers
      if (isSuspiciousHost(hostname)) {
        console.warn(`Suspicious host header detected: ${hostname}`);
        return res.status(400).json({ error: 'Invalid request' });
      }

      // Skip domain resolution for API routes that already have tenant context
      if (req.context?.tenant) {
        return next();
      }

      // Check if this is a default/development domain
      if (isDefaultDomain(hostname)) {
        return next();
      }

      // HTTPS enforcement for custom domains
      if (enforceHttps && !isHttps(req)) {
        if (req.path.startsWith('/api/')) {
          return res.status(403).json({ 
            error: 'HTTPS required',
            message: 'This API endpoint requires a secure connection',
          });
        }
        
        const httpsUrl = `https://${hostname}${req.originalUrl}`;
        return res.redirect(301, httpsUrl);
      }

      // Try to resolve tenant from custom domain
      const resolvedTenant = await domainService.resolveTenantByHost(hostname);

      if (resolvedTenant) {
        // Domain found and verified - attach tenant to request context
        req.context = req.context || {} as any;
        (req.context as any).tenant = {
          id: resolvedTenant.id,
          name: resolvedTenant.name,
          slug: resolvedTenant.slug,
          businessType: resolvedTenant.businessType,
        };
        (req.context as any).resolvedDomain = {
          domain: resolvedTenant.domain.domain,
          isPrimary: resolvedTenant.domain.isPrimary,
          enforceHttps: resolvedTenant.domain.enforceHttps,
        };

        // Check for domain-specific redirect
        if (resolvedTenant.domain.redirectToSlug) {
          const redirectUrl = `/${resolvedTenant.domain.redirectToSlug}${req.originalUrl}`;
          return res.redirect(302, redirectUrl);
        }

        return next();
      }

      // Custom domain not found or not verified
      const pendingDomain = await domainService.getDomainByName(hostname);
      
      if (pendingDomain) {
        if (pendingDomain.verificationStatus === 'pending' || 
            pendingDomain.verificationStatus === 'verifying') {
          return res.status(503).json({
            error: 'Domain pending verification',
            message: 'This domain is registered but not yet verified.',
            status: pendingDomain.verificationStatus,
          });
        }

        if (pendingDomain.verificationStatus === 'failed') {
          return res.status(503).json({
            error: 'Domain verification failed',
            message: 'Domain verification failed. Please check your DNS settings.',
          });
        }

        if (pendingDomain.verificationStatus === 'revoked') {
          return res.status(403).json({
            error: 'Domain access revoked',
            message: 'This domain\'s verification has been revoked.',
          });
        }
      }

      // No tenant found - continue without tenant context
      return next();
    } catch (error) {
      console.error('Domain resolution error:', error);
      return next();
    }
  };
}

/**
 * Middleware to require verified custom domain
 */
export function requireVerifiedDomain() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req.context as any)?.resolvedDomain) {
      return res.status(403).json({
        error: 'Verified domain required',
        message: 'This endpoint requires access via a verified custom domain',
      });
    }
    next();
  };
}

/**
 * Middleware to get domain branding info
 */
export function attachDomainBranding() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.context?.tenant?.id) {
      const tenantId = req.context.tenant.id;
      
      // Get primary domain info
      const primaryDomain = await domainService.getPrimaryDomain(tenantId);
      
      // Get tenant branding
      const tenantBranding = await brandingService.getBranding(tenantId);
      
      (req.context as any).branding = {
        customDomain: primaryDomain?.domain || null,
        enforceHttps: primaryDomain?.enforceHttps || false,
        theme: tenantBranding ? {
          logoUrl: tenantBranding.logoUrl,
          logoAltUrl: tenantBranding.logoAltUrl,
          faviconUrl: tenantBranding.faviconUrl,
          primaryColor: tenantBranding.primaryColor,
          secondaryColor: tenantBranding.secondaryColor,
          accentColor: tenantBranding.accentColor,
          backgroundColor: tenantBranding.backgroundColor,
          textColor: tenantBranding.textColor,
          fontFamily: tenantBranding.fontFamily,
          fontFamilyHeading: tenantBranding.fontFamilyHeading,
          fontFamilyMono: tenantBranding.fontFamilyMono,
          themeTokens: tenantBranding.themeTokens,
          customCss: tenantBranding.customCss,
        } : null,
      };
    }
    next();
  };
}

/**
 * Middleware to inject CSS variables for tenant branding
 */
export function injectBrandingStyles() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.context?.tenant?.id && !req.path.startsWith('/api/')) {
      // Load tenant branding first, then generate CSS variables
      const tenantBranding = await brandingService.getBranding(req.context.tenant.id);
      const cssVars = brandingService.generateCssVariables(tenantBranding);
      (req.context as any).brandingCss = cssVars;
    }
    next();
  };
}
