export class MicrosoftStrategyMock {
  constructor() {}
  validate(accessToken, refreshToken, profile, done) {
    done(null, {
      email: 'mock@microsoft.com',
      displayName: 'Mock Microsoft User',
      provider: 'microsoft',
      providerId: 'mock-id',
    });
  }
}
