export class AppleStrategyMock {
  constructor() {}
  validate(accessToken, refreshToken, profile, done) {
    done(null, {
      email: 'mock@apple.com',
      displayName: 'Mock Apple User',
      provider: 'apple',
      providerId: 'mock-id',
    });
  }
}
