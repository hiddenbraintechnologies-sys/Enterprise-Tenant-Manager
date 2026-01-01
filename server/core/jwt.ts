import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { db } from "../db";
import { refreshTokens, apiTokens, users, type User } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { resolveTenantFromUser } from "./context";

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required for JWT signing");
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_MAX_DAYS = 30;

export interface TokenPayload extends JwtPayload {
  sub: string;
  tnt: string | null;
  rol: string | null;
  perms: string[];
  type: "access" | "refresh";
  jti: string;
  ver: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface DecodedToken {
  userId: string;
  tenantId: string | null;
  roleId: string | null;
  permissions: string[];
  jti: string;
}

function generateTokenId(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class JWTAuthService {
  async generateTokenPair(
    userId: string,
    tenantId: string | null,
    roleId: string | null,
    permissions: string[],
    deviceInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair> {
    const accessJti = generateTokenId();
    const refreshJti = generateTokenId();

    const accessPayload: TokenPayload = {
      sub: userId,
      tnt: tenantId,
      rol: roleId,
      perms: permissions,
      type: "access",
      jti: accessJti,
      ver: 1,
    };

    const refreshPayload: TokenPayload = {
      sub: userId,
      tnt: tenantId,
      rol: roleId,
      perms: [],
      type: "refresh",
      jti: refreshJti,
      ver: 1,
    };

    const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: "bizflow",
      audience: "bizflow-api",
    } as SignOptions);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
      issuer: "bizflow",
      audience: "bizflow-api",
    } as SignOptions);

    await db.insert(refreshTokens).values({
      userId,
      tenantId,
      tokenHash: hashToken(refreshJti),
      deviceInfo: deviceInfo || {},
      expiresAt: refreshExpiresAt,
      isRevoked: false,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      tokenType: "Bearer",
    };
  }

  async verifyAccessToken(token: string): Promise<DecodedToken | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "bizflow",
        audience: "bizflow-api",
      }) as TokenPayload;

      if (decoded.type !== "access") {
        return null;
      }

      return {
        userId: decoded.sub,
        tenantId: decoded.tnt,
        roleId: decoded.rol,
        permissions: decoded.perms,
        jti: decoded.jti,
      };
    } catch (error) {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<DecodedToken | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "bizflow",
        audience: "bizflow-api",
      }) as TokenPayload;

      if (decoded.type !== "refresh") {
        return null;
      }

      const tokenHash = hashToken(decoded.jti);
      const [storedToken] = await db.select()
        .from(refreshTokens)
        .where(and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false)
        ));

      if (!storedToken) {
        return null;
      }

      if (new Date() > storedToken.expiresAt) {
        await this.revokeRefreshToken(storedToken.id);
        return null;
      }

      return {
        userId: decoded.sub,
        tenantId: decoded.tnt,
        roleId: decoded.rol,
        permissions: decoded.perms,
        jti: decoded.jti,
      };
    } catch (error) {
      return null;
    }
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    deviceInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair | null> {
    const decoded = await this.verifyRefreshToken(oldRefreshToken);
    if (!decoded) {
      return null;
    }

    const oldTokenHash = hashToken(decoded.jti);
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, oldTokenHash));

    const tenantInfo = await resolveTenantFromUser(decoded.userId);

    return this.generateTokenPair(
      decoded.userId,
      tenantInfo.tenant?.id || null,
      tenantInfo.role?.id || null,
      tenantInfo.permissions,
      deviceInfo
    );
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, tokenId));
  }

  async revokeRefreshTokenByValue(refreshToken: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as TokenPayload | null;
      if (!decoded?.jti) {
        return false;
      }

      const tokenHash = hashToken(decoded.jti);
      
      const [existingToken] = await db.select({ id: refreshTokens.id, isRevoked: refreshTokens.isRevoked })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (!existingToken || existingToken.isRevoked) {
        return false;
      }

      await db.update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.tokenHash, tokenHash));

      return true;
    } catch {
      return false;
    }
  }

  async revokeAllUserTokens(userId: string, tenantId?: string): Promise<void> {
    if (tenantId) {
      await db.update(refreshTokens)
        .set({ isRevoked: true })
        .where(and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tenantId, tenantId)
        ));
    } else {
      await db.update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.userId, userId));
    }
  }

  async generateApiToken(
    userId: string,
    tenantId: string,
    name: string,
    scopes: string[],
    expiresInDays?: number
  ): Promise<{ token: string; tokenId: string }> {
    const tokenId = generateTokenId();
    const tokenHash = hashToken(tokenId);

    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(apiTokens).values({
      userId,
      tenantId,
      name,
      tokenHash,
      scopes: scopes as any,
      expiresAt,
      isActive: true,
    });

    return {
      token: tokenId,
      tokenId: tokenHash.slice(0, 8),
    };
  }

  async verifyApiToken(token: string): Promise<{
    userId: string;
    tenantId: string | null;
    scopes: string[];
  } | null> {
    const tokenHash = hashToken(token);

    const [storedToken] = await db.select()
      .from(apiTokens)
      .where(and(
        eq(apiTokens.tokenHash, tokenHash),
        eq(apiTokens.isActive, true)
      ));

    if (!storedToken) {
      return null;
    }

    if (storedToken.expiresAt && new Date() > storedToken.expiresAt) {
      return null;
    }

    await db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, storedToken.id));

    return {
      userId: storedToken.userId,
      tenantId: storedToken.tenantId,
      scopes: (storedToken.scopes as string[]) || [],
    };
  }

  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    
    const result = await db.delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now));

    return 0;
  }

  async exchangeSessionForTokens(
    user: User,
    deviceInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair> {
    const tenantInfo = await resolveTenantFromUser(user.id);

    return this.generateTokenPair(
      user.id,
      tenantInfo.tenant?.id || null,
      tenantInfo.role?.id || null,
      tenantInfo.permissions,
      deviceInfo
    );
  }

  async switchTenant(
    userId: string,
    newTenantId: string,
    deviceInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair | null> {
    const tenantInfo = await resolveTenantFromUser(userId);
    
    if (!tenantInfo.tenant || tenantInfo.tenant.id !== newTenantId) {
      return null;
    }

    return this.generateTokenPair(
      userId,
      newTenantId,
      tenantInfo.role?.id || null,
      tenantInfo.permissions,
      deviceInfo
    );
  }
}

export const jwtAuthService = new JWTAuthService();
