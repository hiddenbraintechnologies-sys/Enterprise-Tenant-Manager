import { beforeAll, afterAll, jest } from "@jest/globals";

jest.mock('openid-client', () => require('../test-support/shims/openid-client'));
jest.mock('openid-client/passport', () => require('../test-support/shims/openid-client'));

beforeAll(async () => {
  process.env.SKIP_BOOTSTRAP = 'true';
  console.log("[test] Setting up test environment");
});

afterAll(async () => {
  console.log("[test] Cleaning up test environment");
});
