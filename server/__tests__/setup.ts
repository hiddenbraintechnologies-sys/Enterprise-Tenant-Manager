import { beforeAll, afterAll } from "@jest/globals";

beforeAll(async () => {
  console.log("[test] Setting up test environment");
});

afterAll(async () => {
  console.log("[test] Cleaning up test environment");
});
