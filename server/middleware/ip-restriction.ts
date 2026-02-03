import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantIpRules } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function ipInCidr(ip: string, cidr: string): boolean {
  if (cidr === "0.0.0.0/0" || cidr === "::/0") {
    return true;
  }

  const [range, bits] = cidr.split("/");
  const mask = parseInt(bits, 10);
  
  if (ip.includes(":") !== range.includes(":")) {
    return false;
  }
  
  if (ip.includes(":")) {
    return false;
  }
  
  const ipParts = ip.split(".").map(Number);
  const rangeParts = range.split(".").map(Number);
  
  if (ipParts.some(isNaN) || rangeParts.some(isNaN)) {
    return false;
  }
  
  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
  const maskNum = mask ? (-1 << (32 - mask)) : -1;
  
  return (ipNum & maskNum) === (rangeNum & maskNum);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "";
}

export async function ipRestrictionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.context?.tenant?.id;
  
  if (!tenantId) {
    return next();
  }

  try {
    const rules = await db
      .select()
      .from(tenantIpRules)
      .where(
        and(
          eq(tenantIpRules.tenantId, tenantId),
          eq(tenantIpRules.isEnabled, true)
        )
      );
    
    if (rules.length === 0) {
      return next();
    }

    const clientIp = getClientIp(req);
    const denyRules = rules.filter(r => r.mode === "deny");
    const allowRules = rules.filter(r => r.mode === "allow");

    for (const rule of denyRules) {
      if (ipInCidr(clientIp, rule.cidr)) {
        console.log(`[ip-restriction] IP ${clientIp} blocked by deny rule ${rule.label || rule.cidr}`);
        return res.status(403).json({
          message: "Access denied",
          code: "IP_NOT_ALLOWED",
          reason: "Your IP address is not allowed to access this resource.",
        });
      }
    }

    if (allowRules.length > 0) {
      const isAllowed = allowRules.some(rule => ipInCidr(clientIp, rule.cidr));
      if (!isAllowed) {
        console.log(`[ip-restriction] IP ${clientIp} not in allow list`);
        return res.status(403).json({
          message: "Access denied",
          code: "IP_NOT_ALLOWED",
          reason: "Your IP address is not allowed to access this resource.",
        });
      }
    }
  } catch (error) {
    console.error("[ip-restriction] Error checking IP rules:", error);
  }

  next();
}
