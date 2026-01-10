# Test Support

This directory contains test infrastructure for the MyBizStream server.

## Directory Structure

```
test-support/
├── createServicesTestApp.ts    # Lightweight test app for services module
├── shims/
│   └── openid-client.ts        # ESM shim for openid-client (Jest compatibility)
└── README.md
```

## Current Test Coverage

### Services Module Tests (`services-api.test.ts`)

The current tests exercise:
- Real route handlers from `server/routes/services/index.ts`
- Storage layer calls
- Pagination response formatting
- Tenant context validation within route handlers
- API contract validation (response shapes)

### What Tests Currently Skip

For faster test execution, the tests inject tenant context directly rather than going through the full middleware stack:
- `isAuthenticated` middleware
- `moduleProtectedMiddleware` (RBAC/feature flags)
- Full `tenantContextMiddleware` pipeline

## Future Improvements

1. **Full Integration Tests**: Create separate integration tests that use the complete middleware stack with a test database.

2. **Middleware Unit Tests**: Add dedicated tests for:
   - Authentication middleware
   - RBAC permission checks
   - Feature flag enforcement
   - Tenant isolation middleware

3. **Test Fixtures**: Create realistic permission/feature fixtures that mirror production configurations.

## ESM Compatibility

The `openid-client` package is pure ESM, which is incompatible with Jest's CommonJS mode. The shim at `shims/openid-client.ts` provides mock exports that allow tests to run without ESM parsing errors.

The shim exports:
- `Issuer.discover()` - Returns a mock issuer
- `generators` - Mock code/state generators  
- `Strategy` class - Mock passport strategy
- `custom` - Mock HTTP options setter
