export class GoogleStrategyMock {
  constructor() {}
  authorizationParams() {
    return { prompt: 'select_account' };
  }
  validate(
    accessToken: string,
    refreshToken: string,
    profile: unknown,
    done: (err: unknown, user: unknown) => void,
  ) {
    done(null, {
      email: 'mock@google.com',
      displayName: 'Mock Google User',
      provider: 'google',
      providerId: 'mock-id',
    });
  }
}
