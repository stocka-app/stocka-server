import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateTenantHandler } from '@tenant/application/commands/create-tenant/create-tenant.handler';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantProfileContract } from '@tenant/domain/contracts/tenant-profile.contract';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { OnboardingAlreadyCompletedError } from '@tenant/domain/errors/onboarding-already-completed.error';
import { TenantLimitExceededError } from '@tenant/domain/errors/tenant-limit-exceeded.error';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('CreateTenantHandler', () => {
  let handler: CreateTenantHandler;
  let tenantContract: jest.Mocked<Pick<ITenantContract, 'findBySlug' | 'persist'>>;
  let memberContract: jest.Mocked<Pick<ITenantMemberContract, 'findActiveByUserUUID' | 'persist'>>;
  let profileContract: jest.Mocked<Pick<ITenantProfileContract, 'persist'>>;
  let configContract: jest.Mocked<Pick<ITenantConfigContract, 'persist'>>;
  let uow: jest.Mocked<
    Pick<IUnitOfWork, 'begin' | 'commit' | 'rollback' | 'isActive' | 'getManager'>
  >;
  let eventPublisher: { mergeObjectContext: jest.Mock };
  let mediator: { user: { findByUUID: jest.Mock } };

  const VALID_COMMAND = new CreateTenantCommand(
    '550e8400-e29b-41d4-a716-446655440000',
    'Mi Tienda',
    'retail',
    'MX',
    'America/Mexico_City',
  );

  beforeEach(async () => {
    tenantContract = {
      findBySlug: jest.fn().mockResolvedValue(null),
      persist: jest.fn().mockImplementation((tenant: TenantAggregate) =>
        Promise.resolve(
          TenantAggregate.reconstitute({
            id: 1,
            uuid: tenant.uuid,
            name: tenant.name,
            slug: tenant.slug,
            businessType: tenant.businessType,
            country: tenant.country,
            timezone: tenant.timezone,
            status: tenant.status,
            ownerUserId: tenant.ownerUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            archivedAt: null,
          }),
        ),
      ),
    };

    memberContract = {
      findActiveByUserUUID: jest.fn().mockResolvedValue(null),
      persist: jest.fn().mockImplementation((member: TenantMemberModel) => Promise.resolve(member)),
    };

    profileContract = {
      persist: jest
        .fn()
        .mockImplementation((profile: TenantProfileModel) => Promise.resolve(profile)),
    };

    configContract = {
      persist: jest.fn().mockImplementation((config: TenantConfigModel) => Promise.resolve(config)),
    };

    uow = {
      begin: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      isActive: jest.fn().mockReturnValue(false),
      getManager: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    mediator = {
      user: {
        findByUUID: jest
          .fn()
          .mockResolvedValue(
            UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440000' }),
          ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTenantHandler,
        { provide: INJECTION_TOKENS.TENANT_CONTRACT, useValue: tenantContract },
        { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useValue: memberContract },
        { provide: INJECTION_TOKENS.TENANT_PROFILE_CONTRACT, useValue: profileContract },
        { provide: INJECTION_TOKENS.TENANT_CONFIG_CONTRACT, useValue: configContract },
        { provide: INJECTION_TOKENS.UNIT_OF_WORK, useValue: uow },
        { provide: EventPublisher, useValue: eventPublisher },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<CreateTenantHandler>(CreateTenantHandler);
  });

  describe('Given the user does not exist', () => {
    beforeEach(() => {
      mediator.user.findByUUID.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns an err with NotFoundException', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().message).toContain('User not found');
      });

      it('Then the UoW transaction is never opened', async () => {
        await handler.execute(VALID_COMMAND);
        expect(uow.begin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given valid onboarding data and no existing membership', () => {
    describe('When the handler executes', () => {
      it('Then the result is ok with a tenantUUID', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().tenantId).toBeDefined();
      });

      it('Then the tenant is persisted', async () => {
        await handler.execute(VALID_COMMAND);
        expect(tenantContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then a member with OWNER role is created', async () => {
        await handler.execute(VALID_COMMAND);
        expect(memberContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then an empty profile is created', async () => {
        await handler.execute(VALID_COMMAND);
        expect(profileContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then a free-tier config is created', async () => {
        await handler.execute(VALID_COMMAND);
        expect(configContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then the UoW transaction is opened and committed', async () => {
        await handler.execute(VALID_COMMAND);
        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();
      });

      it('Then domain events are merged and committed', async () => {
        await handler.execute(VALID_COMMAND);
        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given the user already has an active tenant membership', () => {
    beforeEach(() => {
      memberContract.findActiveByUserUUID.mockResolvedValue(
        TenantMemberModel.create({
          tenantId: 99,
          userId: 42,
          userUUID: '550e8400-e29b-41d4-a716-446655440000',
          role: 'OWNER',
        }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it returns an err with OnboardingAlreadyCompletedError', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingAlreadyCompletedError);
      });

      it('Then the UoW transaction is never opened', async () => {
        await handler.execute(VALID_COMMAND);
        expect(uow.begin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the slug already exists', () => {
    beforeEach(() => {
      tenantContract.findBySlug.mockResolvedValue(
        TenantAggregate.reconstitute({
          id: 99,
          uuid: '550e8400-e29b-41d4-a716-446655440099',
          name: 'Mi Tienda',
          slug: 'mi-tienda',
          businessType: 'retail',
          country: 'MX',
          timezone: 'America/Mexico_City',
          status: 'active',
          ownerUserId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it generates a unique slug with a suffix and succeeds', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isOk()).toBe(true);

        const persistedTenant = tenantContract.persist.mock.calls[0][0];
        expect(persistedTenant.slug).not.toBe('mi-tienda');
        expect(persistedTenant.slug).toMatch(/^mi-tienda-[a-z0-9]{8}$/);
      });
    });
  });

  describe('Given an invalid business type that fails VO validation', () => {
    const INVALID_BT_COMMAND = new CreateTenantCommand(
      '550e8400-e29b-41d4-a716-446655440000',
      'Mi Tienda',
      'INVALID_TYPE',
      'MX',
      'America/Mexico_City',
    );

    describe('When the handler executes', () => {
      it('Then it re-throws the validation error', async () => {
        await expect(handler.execute(INVALID_BT_COMMAND)).rejects.toThrow(
          'Invalid BusinessType value: INVALID_TYPE',
        );
      });

      it('Then the UoW transaction is never opened', async () => {
        await expect(handler.execute(INVALID_BT_COMMAND)).rejects.toThrow();
        expect(uow.begin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a persist call throws a domain exception inside the transaction', () => {
    beforeEach(() => {
      tenantContract.persist.mockRejectedValue(new TenantLimitExceededError('warehouses'));
    });

    describe('When the handler executes', () => {
      it('Then it rolls back the UoW and returns an err with the domain error', async () => {
        const result = await handler.execute(VALID_COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TenantLimitExceededError);
        expect(uow.rollback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given the persist call throws an unexpected error', () => {
    beforeEach(() => {
      tenantContract.persist.mockRejectedValue(new Error('DB connection lost'));
    });

    describe('When the handler executes', () => {
      it('Then it rolls back the UoW and re-throws the error', async () => {
        await expect(handler.execute(VALID_COMMAND)).rejects.toThrow('DB connection lost');
        expect(uow.rollback).toHaveBeenCalledTimes(1);
      });
    });
  });
});
