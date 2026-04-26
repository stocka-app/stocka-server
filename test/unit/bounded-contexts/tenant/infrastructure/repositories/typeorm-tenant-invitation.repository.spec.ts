import type { Repository } from 'typeorm';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { TenantInvitationEntity } from '@tenant/infrastructure/entities/tenant-invitation.entity';
import { TypeOrmTenantInvitationRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-invitation.repository';

const TENANT_ID = 17;

function buildEntity(overrides: Partial<TenantInvitationEntity> = {}): TenantInvitationEntity {
  const entity = new TenantInvitationEntity();
  Object.assign(entity, {
    id: '019538a0-0000-7000-8000-000000000001',
    tenantId: TENANT_ID,
    tenantUUID: '019538a0-0000-7000-8000-000000000099',
    tenantName: 'Mi Negocio',
    invitedBy: 1,
    email: 'invited@example.com',
    role: 'BUYER',
    token: 'abc-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date(),
    ...overrides,
  });
  return entity;
}

function makeRepoStub(): jest.Mocked<Repository<TenantInvitationEntity>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<Repository<TenantInvitationEntity>>;
}

describe('TypeOrmTenantInvitationRepository', () => {
  describe('findByToken', () => {
    describe('Given a row exists for the token', () => {
      it('Then it returns the mapped model', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(buildEntity());
        const sut = new TypeOrmTenantInvitationRepository(repo);

        const result = await sut.findByToken('abc-token');

        expect(result).toBeInstanceOf(TenantInvitationModel);
      });
    });

    describe('Given no row matches', () => {
      it('Then it returns null', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(null);
        const sut = new TypeOrmTenantInvitationRepository(repo);

        expect(await sut.findByToken('missing')).toBeNull();
      });
    });
  });

  describe('findById', () => {
    describe('Given the row exists', () => {
      it('Then it returns the model', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(buildEntity());
        const sut = new TypeOrmTenantInvitationRepository(repo);

        const result = await sut.findById('019538a0-0000-7000-8000-000000000001');

        expect(result).toBeInstanceOf(TenantInvitationModel);
      });
    });

    describe('Given the row does not exist', () => {
      it('Then it returns null', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(null);
        const sut = new TypeOrmTenantInvitationRepository(repo);

        expect(await sut.findById('missing')).toBeNull();
      });
    });
  });

  describe('findPendingByEmail', () => {
    describe('Given a pending invitation matches the email and tenant', () => {
      it('Then it returns the model', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(buildEntity());
        const sut = new TypeOrmTenantInvitationRepository(repo);

        const result = await sut.findPendingByEmail(TENANT_ID, 'invited@example.com');

        expect(result).toBeInstanceOf(TenantInvitationModel);
      });
    });

    describe('Given no pending invitation matches', () => {
      it('Then it returns null', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(null);
        const sut = new TypeOrmTenantInvitationRepository(repo);

        expect(await sut.findPendingByEmail(TENANT_ID, 'nobody@example.com')).toBeNull();
      });
    });
  });

  describe('findAllByTenantId', () => {
    describe('Given a tenant with multiple invitations', () => {
      it('Then it returns mapped models', async () => {
        const repo = makeRepoStub();
        repo.find.mockResolvedValue([
          buildEntity(),
          buildEntity({ id: '019538a0-0000-7000-8000-000000000002' }),
        ]);
        const sut = new TypeOrmTenantInvitationRepository(repo);

        const result = await sut.findAllByTenantId(TENANT_ID);

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('create', () => {
    describe('Given valid invitation props', () => {
      it('Then it creates and persists the entity', async () => {
        const repo = makeRepoStub();
        const entity = buildEntity();
        repo.create.mockReturnValue(entity);
        repo.save.mockResolvedValue(entity);
        const sut = new TypeOrmTenantInvitationRepository(repo);

        const result = await sut.create({
          tenantId: TENANT_ID,
          tenantUUID: '019538a0-0000-7000-8000-000000000099',
          tenantName: 'Mi Negocio',
          invitedBy: 1,
          email: 'invited@example.com',
          role: 'BUYER',
          token: 'abc-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        expect(result).toBeInstanceOf(TenantInvitationModel);
        expect(repo.save).toHaveBeenCalled();
      });
    });
  });

  describe('markAccepted', () => {
    describe('Given an invitation id', () => {
      it('Then it sets acceptedAt to a Date', async () => {
        const repo = makeRepoStub();
        const sut = new TypeOrmTenantInvitationRepository(repo);

        await sut.markAccepted('019538a0-0000-7000-8000-000000000001');

        expect(repo.update).toHaveBeenCalledWith(
          { id: '019538a0-0000-7000-8000-000000000001' },
          { acceptedAt: expect.any(Date) },
        );
      });
    });
  });

  describe('cancel', () => {
    describe('Given an invitation id', () => {
      it('Then it deletes the row', async () => {
        const repo = makeRepoStub();
        const sut = new TypeOrmTenantInvitationRepository(repo);

        await sut.cancel('019538a0-0000-7000-8000-000000000001');

        expect(repo.delete).toHaveBeenCalledWith({ id: '019538a0-0000-7000-8000-000000000001' });
      });
    });
  });
});
