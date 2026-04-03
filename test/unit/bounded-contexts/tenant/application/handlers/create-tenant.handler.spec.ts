import { EventPublisher } from '@nestjs/cqrs';
import { CreateTenantHandler } from '@tenant/application/commands/create-tenant/create-tenant.handler';
import { TenantOwnerNotFoundError } from '@tenant/domain/errors/tenant-owner-not-found.error';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantProfileContract } from '@tenant/domain/contracts/tenant-profile.contract';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { OnboardingAlreadyCompletedError } from '@tenant/domain/errors/onboarding-already-completed.error';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(overrides: Partial<CreateTenantCommand> = {}): CreateTenantCommand {
  return new CreateTenantCommand(
    overrides.userUUID ?? 'user-uuid-123',
    overrides.name ?? 'My Business',
    overrides.businessType ?? 'retail',
    overrides.country ?? 'MX',
    overrides.timezone ?? 'America/Mexico_City',
  );
}

function buildUser(id?: number): UserAggregate {
  return { id, uuid: 'user-uuid-123' } as unknown as UserAggregate;
}


function buildSavedTenant(): TenantAggregate {
  return {
    id: 1,
    uuid: 'tenant-uuid-abc',
    name: 'My Business',
    commit: jest.fn(),
  } as unknown as TenantAggregate;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreateTenantHandler', () => {
  let handler: CreateTenantHandler;
  let tenantContract: jest.Mocked<ITenantContract>;
  let memberContract: jest.Mocked<ITenantMemberContract>;
  let profileContract: jest.Mocked<ITenantProfileContract>;
  let configContract: jest.Mocked<ITenantConfigContract>;
  let uow: jest.Mocked<IUnitOfWork>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    tenantContract = {
      findById: jest.fn(),
      findByUUID: jest.fn(),
      findBySlug: jest.fn(),
      persist: jest.fn(),
    };

    memberContract = {
      findActiveByUserUUID: jest.fn(),
      findAllByTenantId: jest.fn(),
      findByTenantAndUserId: jest.fn(),
      persist: jest.fn(),
    };

    profileContract = {
      findByTenantId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<ITenantProfileContract>;

    configContract = {
      findByTenantId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<ITenantConfigContract>;

    uow = {
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      execute: jest.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    } as unknown as jest.Mocked<IUnitOfWork>;

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    mediator = {
      user: {
        findByUUID: jest.fn(),
      },
    } as unknown as jest.Mocked<MediatorService>;

    handler = new CreateTenantHandler(
      tenantContract,
      memberContract,
      profileContract,
      configContract,
      uow,
      eventPublisher,
      mediator,
    );
  });

  describe('Given the user is not found', () => {
    describe('When execute is called with a non-existing user UUID', () => {
      beforeEach(() => {
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(null);
      });

      it('Then it returns a TenantOwnerNotFoundError error', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TenantOwnerNotFoundError);
      });
    });
  });

  describe('Given the user already has an active membership', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUser(42));
        memberContract.findActiveByUserUUID.mockResolvedValue({
          id: 1,
          tenantId: 1,
          userId: 42,
          isActive: jest.fn().mockReturnValue(true),
          role: { toString: () => 'OWNER' },
        } as unknown as ReturnType<typeof memberContract.findActiveByUserUUID> extends Promise<infer T> ? T : never);
      });

      it('Then it returns an OnboardingAlreadyCompletedError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingAlreadyCompletedError);
      });
    });
  });

  describe('Given the user exists but the businessType value is not a valid enum', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUser(42));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
      });

      it('Then it rethrows the plain Error thrown by the VO constructor', async () => {
        // 'INVALID_TYPE' is not a valid BusinessTypeEnum value → BusinessTypeVO.fromString throws
        await expect(
          handler.execute(buildCommand({ businessType: 'INVALID_TYPE' })),
        ).rejects.toThrow('Invalid BusinessType value: INVALID_TYPE');
      });
    });
  });

  describe('Given the user exists and has no active membership', () => {
    describe('When the slug is unique and the transaction succeeds', () => {
      let savedTenant: TenantAggregate;

      beforeEach(() => {
        savedTenant = buildSavedTenant();
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUser(42));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        tenantContract.findBySlug.mockResolvedValue(null); // slug is unique
        tenantContract.persist.mockResolvedValue(savedTenant);
        memberContract.persist.mockResolvedValue({} as ReturnType<typeof memberContract.persist> extends Promise<infer T> ? T : never);
        profileContract.persist.mockResolvedValue({} as ReturnType<typeof profileContract.persist> extends Promise<infer T> ? T : never);
        configContract.persist.mockResolvedValue({} as ReturnType<typeof configContract.persist> extends Promise<infer T> ? T : never);
        uow.begin.mockResolvedValue(undefined);
        uow.commit.mockResolvedValue(undefined);
      });

      it('Then it returns ok with the tenantId and name', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().tenantId).toBe('tenant-uuid-abc');
        expect(result._unsafeUnwrap().name).toBe('My Business');
      });

      it('Then it publishes domain events via eventPublisher', async () => {
        await handler.execute(buildCommand());
        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(savedTenant);
      });
    });

    describe('When the slug already exists (collision)', () => {
      let savedTenant: TenantAggregate;

      beforeEach(() => {
        savedTenant = buildSavedTenant();
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUser(42));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        tenantContract.findBySlug.mockResolvedValue({} as TenantAggregate); // slug taken
        tenantContract.persist.mockResolvedValue(savedTenant);
        memberContract.persist.mockResolvedValue({} as ReturnType<typeof memberContract.persist> extends Promise<infer T> ? T : never);
        profileContract.persist.mockResolvedValue({} as ReturnType<typeof profileContract.persist> extends Promise<infer T> ? T : never);
        configContract.persist.mockResolvedValue({} as ReturnType<typeof configContract.persist> extends Promise<infer T> ? T : never);
        uow.begin.mockResolvedValue(undefined);
        uow.commit.mockResolvedValue(undefined);
      });

      it('Then it still succeeds with a suffixed slug', async () => {
        const result = await handler.execute(buildCommand());
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When the transaction throws a DomainException', () => {
      class TestDomainException extends DomainException {
        constructor() {
          super('TEST_ERROR', 'domain error in transaction');
        }
      }

      beforeEach(() => {
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUser(42));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        tenantContract.findBySlug.mockResolvedValue(null);
        tenantContract.persist.mockRejectedValue(new TestDomainException());
      });

      it('Then it rethrows the domain exception', async () => {
        await expect(handler.execute(buildCommand())).rejects.toThrow(TestDomainException);
      });
    });

    describe('When the transaction throws a non-domain error', () => {
      beforeEach(() => {
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(buildUser(42));
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
        tenantContract.findBySlug.mockResolvedValue(null);
        tenantContract.persist.mockRejectedValue(new Error('DB connection failed'));
      });

      it('Then it rethrows the error', async () => {
        await expect(handler.execute(buildCommand())).rejects.toThrow('DB connection failed');
      });
    });
  });
});
