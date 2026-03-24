import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetMeController } from '@user/infrastructure/controllers/get-me/get-me.controller';
import { UserFacade } from '@user/infrastructure/facade/user.facade';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockFacade(): jest.Mocked<
  Pick<UserFacade, 'findUserByUUIDWithCredential' | 'findUsernameByUUID' | 'findDisplayNameByUserUUID'>
> {
  return {
    findUserByUUIDWithCredential: jest.fn(),
    findUsernameByUUID: jest.fn(),
    findDisplayNameByUserUUID: jest.fn().mockResolvedValue(null),
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
        const mockCredential = { email: 'user@example.com' };

        facade.findUserByUUIDWithCredential.mockResolvedValue({
          user: mockUser as never,
          credential: mockCredential as never,
        });
        facade.findUsernameByUUID.mockResolvedValue('johndoe');

        const result = await controller.handle('user-uuid-abc');

        expect(result.id).toBe('user-uuid-abc');
        expect(result.email).toBe('user@example.com');
        expect(result.username).toBe('johndoe');
        expect(result.createdAt).toBe(new Date('2024-01-01').toISOString());
      });
    });
  });

  describe('Given a valid user UUID but no username set in profile', () => {
    describe('When handle is called', () => {
      it('Then it falls back to email as username', async () => {
        const mockUser = { uuid: 'user-uuid-abc', createdAt: new Date('2024-01-01') };
        const mockCredential = { email: 'user@example.com' };

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
});
