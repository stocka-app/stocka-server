import type { Repository } from 'typeorm';
import type { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';
import { TenantMemberMapper } from '@tenant/infrastructure/mappers/tenant-member.mapper';
import { TypeOrmTenantMemberRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-member.repository';

const TENANT_ID = 17;
const USER_UUID = '019538a0-0000-7000-8000-000000000001';

function buildEntity(): TenantMemberEntity {
  const entity = new TenantMemberEntity();
  Object.assign(entity, {
    id: 1,
    uuid: '019538a0-0000-7000-8000-000000000099',
    tenantId: TENANT_ID,
    userId: 42,
    userUUID: USER_UUID,
    role: 'OWNER',
    status: 'active',
    invitedBy: null,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  });
  return entity;
}

function makeRepoStub(): jest.Mocked<Repository<TenantMemberEntity>> {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<TenantMemberEntity>>;
}

const uowStub: IUnitOfWork = {
  isActive: jest.fn().mockReturnValue(false),
  getManager: jest.fn(),
  execute: jest.fn(),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  runIsolated: jest.fn(),
} as unknown as IUnitOfWork;

describe('TypeOrmTenantMemberRepository', () => {
  describe('findActiveByUserUUID', () => {
    describe('Given an active membership for the user', () => {
      it('Then it returns the mapped model', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(buildEntity());
        const sut = new TypeOrmTenantMemberRepository(repo, uowStub);

        const result = await sut.findActiveByUserUUID(USER_UUID);

        expect(result).toBeInstanceOf(TenantMemberModel);
      });
    });

    describe('Given no active membership exists', () => {
      it('Then it returns null', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(null);
        const sut = new TypeOrmTenantMemberRepository(repo, uowStub);

        const result = await sut.findActiveByUserUUID(USER_UUID);

        expect(result).toBeNull();
      });
    });
  });

  describe('persist', () => {
    describe('Given a member to persist', () => {
      it('Then it saves through the injected repository when no UoW transaction is active', async () => {
        const repo = makeRepoStub();
        const entity = buildEntity();
        repo.save.mockResolvedValue(entity as unknown as TenantMemberEntity);
        const sut = new TypeOrmTenantMemberRepository(repo, uowStub);

        const model = TenantMemberMapper.toDomain(entity);
        const result = await sut.persist(model);

        expect(repo.save).toHaveBeenCalled();
        expect(result).toBeInstanceOf(TenantMemberModel);
      });
    });

    describe('Given a member to persist while a UoW transaction is active', () => {
      it('Then it saves through the QueryRunner manager repository', async () => {
        const repo = makeRepoStub();
        const entity = buildEntity();
        const transactionalRepoSave = jest.fn().mockResolvedValue(entity);
        const transactionalRepo = { save: transactionalRepoSave };
        const manager = {
          getRepository: jest.fn().mockReturnValue(transactionalRepo),
        };
        const activeUow: IUnitOfWork = {
          isActive: jest.fn().mockReturnValue(true),
          getManager: jest.fn().mockReturnValue(manager),
          execute: jest.fn(),
          begin: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          runIsolated: jest.fn(),
        } as unknown as IUnitOfWork;
        const sut = new TypeOrmTenantMemberRepository(repo, activeUow);

        const model = TenantMemberMapper.toDomain(entity);
        await sut.persist(model);

        expect(transactionalRepoSave).toHaveBeenCalled();
        expect(repo.save).not.toHaveBeenCalled();
      });
    });
  });
});
