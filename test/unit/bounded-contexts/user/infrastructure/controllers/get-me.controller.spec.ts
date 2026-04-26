import { NotFoundException } from '@nestjs/common';
import { GetMeController } from '@user/infrastructure/controllers/get-me/get-me.controller';
import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { asPersisted } from '@test/helpers/persisted';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUser(): Persisted<UserAggregate> {
  return asPersisted({
    uuid: 'user-uuid-123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  } as unknown as UserAggregate);
}

function buildCredential(): Persisted<CredentialAccountModel> {
  return asPersisted({
    email: 'test@example.com',
    status: { toString: () => 'active' },
  } as unknown as CredentialAccountModel);
}

function buildFacade(): jest.Mocked<UserFacade> {
  return {
    findUserByUUIDWithCredential: jest.fn(),
    findUsernameByUUID: jest.fn(),
    findDisplayNameByUserUUID: jest.fn(),
    findSocialNameByUserUUID: jest.fn(),
  } as unknown as jest.Mocked<UserFacade>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetMeController', () => {
  let controller: GetMeController;
  let userFacade: jest.Mocked<UserFacade>;

  beforeEach(() => {
    userFacade = buildFacade();
    controller = new GetMeController(userFacade);
  });

  describe('Given the authenticated user exists', () => {
    describe('When all facade calls return valid data', () => {
      beforeEach(() => {
        userFacade.findUserByUUIDWithCredential.mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        userFacade.findUsernameByUUID.mockResolvedValue('testuser');
        userFacade.findDisplayNameByUserUUID.mockResolvedValue('Test User');
        userFacade.findSocialNameByUserUUID.mockResolvedValue({
          givenName: 'Test',
          familyName: 'User',
          avatarUrl: null,
        });
      });

      it('Then it returns the user profile DTO', async () => {
        const result = await controller.handle('user-uuid-123');

        expect(result).toEqual({
          id: 'user-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          givenName: 'Test',
          familyName: 'User',
          avatarUrl: null,
          status: 'active',
          createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        });
      });
    });

    describe('When findUsernameByUUID returns null', () => {
      beforeEach(() => {
        userFacade.findUserByUUIDWithCredential.mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        userFacade.findUsernameByUUID.mockResolvedValue(null);
        userFacade.findDisplayNameByUserUUID.mockResolvedValue(null);
        userFacade.findSocialNameByUserUUID.mockResolvedValue({
          givenName: null,
          familyName: null,
          avatarUrl: null,
        });
      });

      it('Then it falls back to email as username', async () => {
        const result = await controller.handle('user-uuid-123');

        expect(result.username).toBe('test@example.com');
      });
    });
  });

  describe('Given the authenticated user does not exist in the database', () => {
    describe('When findUserByUUIDWithCredential returns null', () => {
      beforeEach(() => {
        userFacade.findUserByUUIDWithCredential.mockResolvedValue(null);
      });

      it('Then it throws NotFoundException', async () => {
        await expect(controller.handle('unknown-uuid')).rejects.toThrow(NotFoundException);
      });

      it('Then it throws with message "User not found"', async () => {
        await expect(controller.handle('unknown-uuid')).rejects.toThrow('User not found');
      });
    });
  });
});
