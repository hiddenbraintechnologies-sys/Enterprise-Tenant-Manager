import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/client/src/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@/(.*)$': '<rootDir>/server/$1',
    '^openid-client$': '<rootDir>/server/test-support/shims/openid-client.ts',
    '^openid-client/passport$': '<rootDir>/server/test-support/shims/openid-client.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: 'tsconfig.spec.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  collectCoverageFrom: [
    'server/**/*.ts',
    'client/src/lib/**/*.ts',
    '!server/**/*.d.ts',
    '!server/__tests__/**',
    '!server/test-support/**',
    '!client/src/lib/__tests__/**',
  ],
};

export default config;
