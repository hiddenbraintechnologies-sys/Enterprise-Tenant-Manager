export class Strategy {
  name = 'openid-client';
  constructor(_options: unknown, _verify: unknown) {}
  authenticate(_req: unknown, _options?: unknown) {
    return { success: true };
  }
}

export type VerifyFunction = (
  tokenSet: unknown,
  userInfo: unknown,
  done: (err: Error | null, user?: unknown) => void
) => void;

export default Strategy;
