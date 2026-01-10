const createMockClient = () => ({
  authorizationUrl: () => 'http://mock-auth-url',
  callback: async () => ({}),
  refresh: async () => ({}),
  userinfo: async () => ({ sub: 'test-user', email: 'test@example.com' }),
});

const createMockIssuer = () => ({
  Client: createMockClient,
});

export const Issuer = {
  discover: async (_url: string) => createMockIssuer(),
};

export const generators = {
  codeVerifier: () => 'mock-code-verifier',
  codeChallenge: (_verifier: string) => 'mock-code-challenge',
  state: () => 'mock-state',
  nonce: () => 'mock-nonce',
};

export const custom = {
  setHttpOptionsDefaults: (_options: any) => {},
};

export class Strategy {
  name = 'openid-client';
  constructor(_options: any, _verify: any) {}
  authenticate(_req: any, _options?: any) {
    return { success: true };
  }
}

export type VerifyFunction = (
  tokenSet: any,
  userInfo: any,
  done: (err: Error | null, user?: any) => void
) => void;

export default {
  Issuer,
  generators,
  custom,
};
