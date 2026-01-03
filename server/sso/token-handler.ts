/**
 * Secure Token Handler
 * 
 * Handles encryption, decryption, and validation of SSO tokens.
 */

import crypto from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SSO_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SSO_ENCRYPTION_KEY or SESSION_SECRET must be set');
  }
  
  // Derive a 32-byte key from the secret
  return crypto.scryptSync(secret, 'sso-token-encryption', 32);
}

/**
 * Encrypt sensitive data (client secrets, tokens)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + authTag + encrypted data
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a nonce for OIDC
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Validate JWT structure (basic validation without signature verification)
 */
export function validateJwtStructure(token: string): { header: any; payload: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    return { header, payload };
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return true;
  
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() < Date.now();
}

/**
 * Parse ID token claims
 */
export function parseIdTokenClaims(idToken: string): Record<string, any> | null {
  const parsed = validateJwtStructure(idToken);
  return parsed?.payload || null;
}

/**
 * Extract user info from OIDC token claims
 */
export function extractUserFromClaims(
  claims: Record<string, any>,
  claimMappings: Record<string, string>
): {
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  providerUserId: string;
} {
  return {
    email: claims[claimMappings.email || 'email'],
    firstName: claims[claimMappings.firstName || 'given_name'],
    lastName: claims[claimMappings.lastName || 'family_name'],
    profileImage: claims[claimMappings.profileImage || 'picture'],
    providerUserId: claims.sub || claims.id || claims.user_id,
  };
}

/**
 * Hash a token for storage (for session lookups)
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}
