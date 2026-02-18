export class GoogleStrategyMock {
  constructor() {}
  authorizationParams() {
    return { prompt: 'select_account' };
  }
  validate(accessToken, refreshToken, profile, done) {
    done(null, {
      email: 'mock@google.com',
      displayName: 'Mock Google User',
      provider: 'google',
      providerId: 'mock-id',
    });
  }
}
