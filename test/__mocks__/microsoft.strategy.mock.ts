export class MicrosoftStrategyMock {
  constructor() {}
  validate(accessToken: string, refreshToken: string, profile: unknown, done: (err: unknown, user: unknown) => void) {
    done(null, {
      email: 'mock@microsoft.com',
      displayName: 'Mock Microsoft User',
      provider: 'microsoft',
      providerId: 'mock-id',
    });
  }
}
