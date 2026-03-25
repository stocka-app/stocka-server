import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetMeController } from '@user/infrastructure/controllers/get-me/get-me.controller';
import { UserFacade } from '@user/infrastructure/facade/user.facade';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockFacade(): jest.Mocked<
  Pick<
    UserFacade,
    | 'findUserByUUIDWithCredential'
    | 'findUsernameByUUID'
    | 'findDisplayNameByUserUUID'
    | 'findSocialNameByUserUUID'
  >
> {
  return {
    findUserByUUIDWithCredential: jest.fn(),
    findUsernameByUUID: jest.fn(),
    findDisplayNameByUserUUID: jest.fn().mockResolvedValue(null),
    findSocialNameByUserUUID: jest
      .fn()
      .mockResolvedValue({ givenName: null, familyName: null, avatarUrl: null }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GetMeController', () => {
  let controller: GetMeController;
  let facade: ReturnType<typeof buildMockFacade>;

  beforeEach(async () => {
    facade = buildMockFacade();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetMeController],
      providers: [{ provide: UserFacade, useValue: facade }],
    }).compile();

    controller = module.get(GetMeController);
  });

  describe('Given a valid authenticated user UUID with a username in the profile', () => {
    describe('When handle is called', () => {
      it('Then it returns the user profile DTO with email and username', async () => {
        const mockUser = { uuid: 'user-uuid-abc', createdAt: new Date('2024-01-01') };
        const mockCredential = { email: 'user@example.com', status: { toString: () => 'active' } };

        facade.findUserByUUIDWithCredential.mockResolvedValue({
          user: mockUser as never,
          credential: mockCredential as never,
        });
        facade.findUsernameByUUID.mockResolvedValue('johndoe');

        const result = await controller.handle('user-uuid-abc');

        expect(result.id).toBe('user-uuid-abc');
        expect(result.email).toBe('user@example.com');
        expect(result.username).toBe('johndoe');
        expect(result.status).toBe('active');
        expect(result.givenName).toBeNull();
        expect(result.familyName).toBeNull();
        expect(result.avatarUrl).toBeNull();
        expect(result.createdAt).toBe(new Date('2024-01-01').toISOString());
      });
    });
  });

  describe('Given a valid user UUID but no username set in profile', () => {
    describe('When handle is called', () => {
      it('Then it falls back to email as username', async () => {
        const mockUser = { uuid: 'user-uuid-abc', createdAt: new Date('2024-01-01') };
        const mockCredential = { email: 'user@example.com', status: { toString: () => 'active' } };

        facade.findUserByUUIDWithCredential.mockResolvedValue({
          user: mockUser as never,
          credential: mockCredential as never,
        });
        facade.findUsernameByUUID.mockResolvedValue(null);

        const result = await controller.handle('user-uuid-abc');

        expect(result.username).toBe('user@example.com');
      });
    });
  });

  describe('Given a UUID for a user that does not exist', () => {
    describe('When handle is called', () => {
      it('Then it throws NotFoundException', async () => {
        facade.findUserByUUIDWithCredential.mockResolvedValue(null);

        await expect(controller.handle('user-uuid-missing')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Given the user has a linked social provider with given name and family name', () => {
    describe('When handle is called', () => {
      it('Then it returns givenName and familyName in the response', async () => {
        const mockUser = { uuid: 'user-uuid-social', createdAt: new Date('2024-01-01') };
        const mockCredential = {
          email: 'social@example.com',
          status: { toString: () => 'email_verified_by_provider' },
        };

        facade.findUserByUUIDWithCredential.mockResolvedValue({
          user: mockUser as never,
          credential: mockCredential as never,
        });
        facade.findUsernameByUUID.mockResolvedValue('socialuser');
        facade.findSocialNameByUserUUID.mockResolvedValue({
          givenName: 'Roberto',
          familyName: 'Medina',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

        const result = await controller.handle('user-uuid-social');

        expect(result.givenName).toBe('Roberto');
        expect(result.familyName).toBe('Medina');
        expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      });
    });
  });

  describe('Given the user has no linked social provider', () => {
    describe('When handle is called', () => {
      it('Then givenName and familyName are null in the response', async () => {
        const mockUser = { uuid: 'user-uuid-nosocial', createdAt: new Date('2024-01-01') };
        const mockCredential = {
          email: 'nosocial@example.com',
          status: { toString: () => 'active' },
        };

        facade.findUserByUUIDWithCredential.mockResolvedValue({
          user: mockUser as never,
          credential: mockCredential as never,
        });
        facade.findUsernameByUUID.mockResolvedValue('nosocialuser');
        facade.findSocialNameByUserUUID.mockResolvedValue({
          givenName: null,
          familyName: null,
          avatarUrl: null,
        });

        const result = await controller.handle('user-uuid-nosocial');

        expect(result.givenName).toBeNull();
        expect(result.familyName).toBeNull();
        expect(result.avatarUrl).toBeNull();
      });
    });
  });
});
