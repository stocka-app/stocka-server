export class FacebookStrategyMock {
  constructor() {}
  validate(accessToken, refreshToken, profile, done) {
    done(null, {
      email: 'mock@facebook.com',
      displayName: 'Mock Facebook User',
      provider: 'facebook',
      providerId: 'mock-id',
    });
  }
}
