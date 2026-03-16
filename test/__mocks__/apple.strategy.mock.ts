export class AppleStrategyMock {
  constructor() {}
  validate(
    accessToken: string,
    refreshToken: string,
    profile: unknown,
    done: (err: unknown, user: unknown) => void,
  ) {
    done(null, {
      email: 'mock@apple.com',
      displayName: 'Mock Apple User',
      provider: 'apple',
      providerId: 'mock-id',
    });
  }
}
