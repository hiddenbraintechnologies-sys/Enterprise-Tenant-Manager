/**
 * Security Headers Middleware
 * 
 * Implements comprehensive security headers for custom domains.
 * Follows OWASP recommendations and modern security best practices.
 */

import { Request, Response, NextFunction } from 'express';

interface SecurityHeadersOptions {
  contentSecurityPolicy?: boolean | string;
  strictTransportSecurity?: boolean | { maxAge: number; includeSubDomains?: boolean; preload?: boolean };
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  xContentTypeOptions?: boolean;
  xXSSProtection?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string | boolean;
  crossOriginEmbedderPolicy?: string | boolean;
  crossOriginOpenerPolicy?: string | boolean;
  crossOriginResourcePolicy?: string | boolean;
  customHeaders?: Record<string, string>;
}

const DEFAULT_OPTIONS: SecurityHeadersOptions = {
  contentSecurityPolicy: true,
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: false },
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: true,
  xXSSProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: true,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
};

/**
 * Build Content Security Policy header value
 */
function buildCSP(isCustomDomain: boolean): string {
  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join('; ');
}

/**
 * Build Permissions Policy header value
 */
function buildPermissionsPolicy(): string {
  const policies: string[] = [
    'accelerometer=()',
    'autoplay=()',
    'camera=()',
    'cross-origin-isolated=()',
    'display-capture=()',
    'encrypted-media=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'keyboard-map=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'sync-xhr=(self)',
    'usb=()',
    'web-share=()',
    'xr-spatial-tracking=()',
  ];

  return policies.join(', ');
}

/**
 * Security headers middleware
 */
export function securityHeaders(options: SecurityHeadersOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const isCustomDomain = !!(req.context as any)?.resolvedDomain;

    // Content Security Policy
    if (config.contentSecurityPolicy) {
      const csp = typeof config.contentSecurityPolicy === 'string'
        ? config.contentSecurityPolicy
        : buildCSP(isCustomDomain);
      res.setHeader('Content-Security-Policy', csp);
    }

    // HTTP Strict Transport Security (HSTS)
    if (config.strictTransportSecurity) {
      const hsts = config.strictTransportSecurity;
      if (typeof hsts === 'object') {
        let value = `max-age=${hsts.maxAge}`;
        if (hsts.includeSubDomains) value += '; includeSubDomains';
        if (hsts.preload) value += '; preload';
        res.setHeader('Strict-Transport-Security', value);
      } else {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
    }

    // X-Frame-Options
    if (config.xFrameOptions) {
      res.setHeader('X-Frame-Options', config.xFrameOptions);
    }

    // X-Content-Type-Options
    if (config.xContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (legacy but still useful)
    if (config.xXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (config.referrerPolicy) {
      res.setHeader('Referrer-Policy', config.referrerPolicy);
    }

    // Permissions-Policy (formerly Feature-Policy)
    if (config.permissionsPolicy) {
      const policy = typeof config.permissionsPolicy === 'string'
        ? config.permissionsPolicy
        : buildPermissionsPolicy();
      res.setHeader('Permissions-Policy', policy);
    }

    // Cross-Origin-Embedder-Policy
    if (config.crossOriginEmbedderPolicy) {
      const value = typeof config.crossOriginEmbedderPolicy === 'string'
        ? config.crossOriginEmbedderPolicy
        : 'require-corp';
      res.setHeader('Cross-Origin-Embedder-Policy', value);
    }

    // Cross-Origin-Opener-Policy
    if (config.crossOriginOpenerPolicy) {
      const value = typeof config.crossOriginOpenerPolicy === 'string'
        ? config.crossOriginOpenerPolicy
        : 'same-origin';
      res.setHeader('Cross-Origin-Opener-Policy', value);
    }

    // Cross-Origin-Resource-Policy
    if (config.crossOriginResourcePolicy) {
      const value = typeof config.crossOriginResourcePolicy === 'string'
        ? config.crossOriginResourcePolicy
        : 'same-origin';
      res.setHeader('Cross-Origin-Resource-Policy', value);
    }

    // Remove potentially dangerous headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Add custom headers
    if (config.customHeaders) {
      for (const [key, value] of Object.entries(config.customHeaders)) {
        res.setHeader(key, value);
      }
    }

    next();
  };
}

/**
 * CORS middleware for custom domains
 */
export function customDomainCORS(allowedOrigins?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const resolvedDomain = (req.context as any)?.resolvedDomain?.domain;

    // Determine allowed origins
    let allowedOriginsList = allowedOrigins || [];
    
    // Always allow the resolved custom domain
    if (resolvedDomain) {
      allowedOriginsList = [
        ...allowedOriginsList,
        `https://${resolvedDomain}`,
        `http://${resolvedDomain}`,
      ];
    }

    // Check if origin is allowed
    if (origin && allowedOriginsList.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * Request ID middleware
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.headers['x-request-id'] as string || 
               `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    (req as any).requestId = id;
    res.setHeader('X-Request-ID', id);
    
    next();
  };
}

/**
 * Rate limit headers middleware
 */
export function rateLimitHeaders(config: {
  limit: number;
  remaining: number;
  resetTime: Date;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-RateLimit-Limit', config.limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.remaining).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(config.resetTime.getTime() / 1000).toString());
    next();
  };
}

/**
 * Cache control middleware for static assets
 */
export function cacheControl(options: {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
  noCache?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.noCache) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      const directives: string[] = [];
      
      if (options.private) {
        directives.push('private');
      } else {
        directives.push('public');
      }
      
      if (options.maxAge !== undefined) {
        directives.push(`max-age=${options.maxAge}`);
      }
      
      if (options.sMaxAge !== undefined) {
        directives.push(`s-maxage=${options.sMaxAge}`);
      }
      
      if (options.staleWhileRevalidate !== undefined) {
        directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
      }
      
      if (directives.length > 0) {
        res.setHeader('Cache-Control', directives.join(', '));
      }
    }
    
    next();
  };
}

/**
 * Security headers for API responses
 */
export function apiSecurityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent caching of API responses by default
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Content type for JSON APIs
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    next();
  };
}
