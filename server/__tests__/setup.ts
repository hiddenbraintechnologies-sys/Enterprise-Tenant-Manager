import { beforeAll, afterAll, jest } from "@jest/globals";

jest.mock('openid-client', () => require('../test-support/shims/openid-client'));
jest.mock('openid-client/passport', () => require('../test-support/shims/openid-client'));

let bootstrapResult: { dbConnected: boolean; errors: string[] } | null = null;

beforeAll(async () => {
  process.env.SKIP_BOOTSTRAP = 'true';
  process.env.NODE_ENV = 'test';
  console.log("[test] Setting up test environment");
  
  try {
    const { runTestBootstrap } = await import('../test-support/test-bootstrap');
    bootstrapResult = await runTestBootstrap();
    
    if (!bootstrapResult.dbConnected) {
      console.warn("[test] Database not available - some tests will be skipped");
    }
    
    if (bootstrapResult.errors.length > 0) {
      console.warn("[test] Bootstrap warnings:", bootstrapResult.errors);
    }
  } catch (error) {
    console.error("[test] Bootstrap failed:", error);
    bootstrapResult = { dbConnected: false, errors: [String(error)] };
  }
});

afterAll(async () => {
  console.log("[test] Cleaning up test environment");
});

export function getBootstrapResult() {
  return bootstrapResult;
}

export function skipIfNoDatabase() {
  if (!bootstrapResult?.dbConnected) {
    console.log("[test] Skipping test - database not available");
    return true;
  }
  return false;
}
