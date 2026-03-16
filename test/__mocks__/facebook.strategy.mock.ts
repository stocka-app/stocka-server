export class FacebookStrategyMock {
  constructor() {}
  validate(accessToken: string, refreshToken: string, profile: unknown, done: (err: unknown, user: unknown) => void) {
    done(null, {
      email: 'mock@facebook.com',
      displayName: 'Mock Facebook User',
      provider: 'facebook',
      providerId: 'mock-id',
    });
  }
}
