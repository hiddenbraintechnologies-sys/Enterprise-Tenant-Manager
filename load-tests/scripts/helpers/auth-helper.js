import http from 'k6/http';
import { check } from 'k6';
import { config, buildUrl, getHeaders } from '../config.js';

// Token cache per VU (Virtual User)
const tokenCache = {};

/**
 * Authenticate a test user and cache the token
 * Falls back to mock token for environments without real auth
 */
export function authenticate(tenant, userIndex) {
  const cacheKey = `${tenant.id}_${userIndex}`;
  
  // Return cached token if available and not expired
  if (tokenCache[cacheKey] && tokenCache[cacheKey].expiresAt > Date.now()) {
    return tokenCache[cacheKey];
  }
  
  const email = `user${userIndex}@${tenant.id}.test`;
  const password = 'TestPassword123!';
  
  const loginPayload = JSON.stringify({ email, password });
  
  const res = http.post(
    buildUrl(config.endpoints.auth.login),
    loginPayload,
    { 
      headers: getHeaders(null, tenant.id),
      tags: { name: 'auth_login' },
    }
  );
  
  // If login succeeds, cache the token
  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      const token = body.accessToken || body.token;
      const refreshToken = body.refreshToken;
      
      if (token) {
        tokenCache[cacheKey] = {
          accessToken: token,
          refreshToken: refreshToken,
          tenantId: tenant.id,
          expiresAt: Date.now() + (14 * 60 * 1000), // 14 minutes
        };
        return tokenCache[cacheKey];
      }
    } catch (e) {
      // Parse error, fall through to mock
    }
  }
  
  // Fall back to mock token for testing without real backend
  // This allows tests to run against mock/stub endpoints
  return {
    accessToken: `mock_token_${tenant.id}_${userIndex}_${Date.now()}`,
    refreshToken: `mock_refresh_${tenant.id}_${userIndex}`,
    tenantId: tenant.id,
    expiresAt: Date.now() + (14 * 60 * 1000),
    isMock: true,
  };
}

/**
 * Refresh an expired token
 */
export function refreshToken(tokenData) {
  if (!tokenData.refreshToken || tokenData.isMock) {
    // For mock tokens, just extend expiry
    return {
      ...tokenData,
      expiresAt: Date.now() + (14 * 60 * 1000),
    };
  }
  
  const res = http.post(
    buildUrl(config.endpoints.auth.refresh),
    JSON.stringify({ refreshToken: tokenData.refreshToken }),
    { 
      headers: getHeaders(null, tokenData.tenantId),
      tags: { name: 'auth_refresh' },
    }
  );
  
  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      return {
        accessToken: body.accessToken || body.token,
        refreshToken: body.refreshToken || tokenData.refreshToken,
        tenantId: tokenData.tenantId,
        expiresAt: Date.now() + (14 * 60 * 1000),
      };
    } catch (e) {
      // Fall through
    }
  }
  
  return tokenData;
}

/**
 * Clear token cache (useful in teardown)
 */
export function clearTokenCache() {
  Object.keys(tokenCache).forEach(key => delete tokenCache[key]);
}

/**
 * Get authenticated headers for API requests
 */
export function getAuthenticatedHeaders(tokenData) {
  return getHeaders(tokenData.accessToken, tokenData.tenantId);
}
