import { SocialSignInHandler } from '@authentication/application/commands/social-sign-in/social-sign-in.handler';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInSaga } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from 'neverthrow';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestDomainException extends DomainException {
  constructor() {
    super('TEST_ERROR', 'test error');
  }
}

function buildCommand(): SocialSignInCommand {
  return {
    email: 'social@example.com',
    displayName: 'Social User',
    provider: 'google',
    providerId: 'google-id-123',
    givenName: 'Social',
    familyName: 'User',
    avatarUrl: null,
    locale: 'en',
    emailVerified: true,
    jobTitle: null,
    rawData: {},
  } as SocialSignInCommand;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SocialSignInHandler', () => {
  let handler: SocialSignInHandler;
  let saga: jest.Mocked<SocialSignInSaga>;

  beforeEach(() => {
    saga = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SocialSignInSaga>;

    handler = new SocialSignInHandler(saga);
  });

  describe('Given the social sign-in saga fails with a DomainException', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        saga.execute.mockResolvedValue(err(new TestDomainException()));
      });

      it('Then it returns the err result from the saga', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainException);
      });
    });
  });

  describe('Given the social sign-in saga succeeds', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        saga.execute.mockResolvedValue(
          ok({
            user: { uuid: 'user-uuid' } as UserAggregate,
            credential: { email: 'social@example.com' } as CredentialAccountModel,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          }),
        );
      });

      it('Then it returns an ok result with user, credential, and tokens', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        const value = result._unsafeUnwrap();
        expect(value.accessToken).toBe('access-token');
        expect(value.refreshToken).toBe('refresh-token');
      });

      it('Then it passes all command fields to the saga', async () => {
        await handler.execute(buildCommand());

        expect(saga.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'social@example.com',
            provider: 'google',
            providerId: 'google-id-123',
          }),
        );
      });
    });
  });
});
