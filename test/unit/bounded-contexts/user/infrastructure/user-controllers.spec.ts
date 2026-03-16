import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { GetMeController } from '@user/infrastructure/controllers/get-me/get-me.controller';
import { ok, err } from '@shared/domain/result';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockQueryBus(): jest.Mocked<QueryBus> {
  return { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GetMeController', () => {
  let controller: GetMeController;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    queryBus = buildMockQueryBus();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetMeController],
      providers: [{ provide: QueryBus, useValue: queryBus }],
    }).compile();

    controller = module.get(GetMeController);
  });

  describe('Given a valid authenticated user UUID', () => {
    describe('When handle is called', () => {
      it('Then it returns the user profile DTO', async () => {
        const mockUser = {
          uuid: 'user-uuid-abc',
          createdAt: new Date('2024-01-01'),
        };
        const mockResult = ok(mockUser);
        queryBus.execute.mockResolvedValue(mockResult);

        const result = await controller.handle('user-uuid-abc');

        expect(result.id).toBe('user-uuid-abc');
        // email and username are pending CredentialAccount / PersonalProfile enrichment
        expect(result.email).toBe('');
        expect(result.username).toBe('');
        expect(result.createdAt).toBe(new Date('2024-01-01').toISOString());
      });
    });
  });

  describe('Given a UUID for a user that does not exist', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException derived from the domain error', async () => {
        const { UserNotFoundException } = await import(
          '@user/domain/exceptions/user-not-found.exception'
        );
        const mockResult = err(new UserNotFoundException('user-uuid-missing'));
        queryBus.execute.mockResolvedValue(mockResult);

        await expect(controller.handle('user-uuid-missing')).rejects.toThrow();
      });
    });
  });
});
