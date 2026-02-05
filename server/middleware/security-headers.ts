import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://checkout.razorpay.com",
        "https://api.razorpay.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "wss:",
        "ws:",
      ],
      frameSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      reportUri: ["/api/security/csp-report"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

export const permissionsPolicyMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );
  next();
};

export const securityHeaders = [
  securityHeadersMiddleware,
  permissionsPolicyMiddleware,
];
