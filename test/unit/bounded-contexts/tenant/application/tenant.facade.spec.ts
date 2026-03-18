import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { TenantFacade } from '@tenant/application/facades/tenant.facade';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { OnboardingAlreadyCompletedError } from '@tenant/domain/errors/onboarding-already-completed.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

describe('TenantFacade', () => {
  let facade: TenantFacade;
  let memberContract: jest.Mocked<Pick<ITenantMemberContract, 'findActiveByUserUUID'>>;
  let tenantContract: jest.Mocked<Pick<ITenantContract, 'findById'>>;
  let commandBus: jest.Mocked<Pick<CommandBus, 'execute'>>;

  const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const TENANT_UUID = '550e8400-e29b-41d4-a716-446655440099';

  const PERSISTED_TENANT = TenantAggregate.reconstitute({
    id: 1,
    uuid: TENANT_UUID,
    name: 'Mi Tienda',
    slug: 'mi-tienda',
    businessType: 'retail',
    country: 'MX',
    timezone: 'America/Mexico_City',
    status: 'active',
    ownerUserId: 42,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  });

  const ACTIVE_MEMBER = TenantMemberModel.reconstitute({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: 1,
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

  beforeEach(async () => {
    memberContract = {
      findActiveByUserUUID: jest.fn(),
    };

    tenantContract = {
      findById: jest.fn(),
    };

    commandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantFacade,
        { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useValue: memberContract },
        { provide: INJECTION_TOKENS.TENANT_CONTRACT, useValue: tenantContract },
        { provide: CommandBus, useValue: commandBus },
      ],
    }).compile();

    facade = module.get<TenantFacade>(TenantFacade);
  });

  describe('getActiveMembership', () => {
    describe('Given the user has an active membership and the tenant exists', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(ACTIVE_MEMBER);
        tenantContract.findById.mockResolvedValue(PERSISTED_TENANT);
      });

      describe('When getActiveMembership is called', () => {
        it('Then it returns tenantUUID and role', async () => {
          const result = await facade.getActiveMembership(USER_UUID);
          expect(result).toEqual({ tenantUUID: TENANT_UUID, role: 'OWNER' });
        });
      });
    });

    describe('Given the user has no active membership', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
      });

      describe('When getActiveMembership is called', () => {
        it('Then it returns null', async () => {
          const result = await facade.getActiveMembership(USER_UUID);
          expect(result).toBeNull();
        });
      });
    });

    describe('Given the user has a membership but the tenant does not exist', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(ACTIVE_MEMBER);
        tenantContract.findById.mockResolvedValue(null);
      });

      describe('When getActiveMembership is called', () => {
        it('Then it returns null', async () => {
          const result = await facade.getActiveMembership(USER_UUID);
          expect(result).toBeNull();
        });
      });
    });

    describe('Given the user has a pending (non-active) membership', () => {
      beforeEach(() => {
        const pendingMember = TenantMemberModel.reconstitute({
          id: 2,
          uuid: '550e8400-e29b-41d4-a716-446655440002',
          tenantId: 1,
          userId: 42,
          userUUID: USER_UUID,
          role: 'OWNER',
          status: 'pending',
          invitedBy: null,
          joinedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });
        memberContract.findActiveByUserUUID.mockResolvedValue(pendingMember);
      });

      describe('When getActiveMembership is called', () => {
        it('Then it returns null because the member is not active', async () => {
          const result = await facade.getActiveMembership(USER_UUID);
          expect(result).toBeNull();
        });
      });
    });
  });

  describe('createTenantForUser', () => {
    describe('Given the command bus returns a successful result', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(ok({ tenantId: TENANT_UUID, name: 'Mi Tienda' }));
      });

      describe('When createTenantForUser is called', () => {
        it('Then it returns the tenantUUID', async () => {
          const result = await facade.createTenantForUser({
            userId: 42,
            userUUID: USER_UUID,
            name: 'Mi Tienda',
            businessType: 'retail',
          });
          expect(result.tenantUUID).toBe(TENANT_UUID);
        });

        it('Then it defaults country and timezone for Mexico', async () => {
          await facade.createTenantForUser({
            userId: 42,
            userUUID: USER_UUID,
            name: 'Mi Tienda',
            businessType: 'retail',
          });
          const command = commandBus.execute.mock.calls[0][0] as CreateTenantCommand;
          expect(command.country).toBe('MX');
          expect(command.timezone).toBe('America/Mexico_City');
        });
      });
    });

    describe('Given the command bus returns an error result', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(err(new OnboardingAlreadyCompletedError()));
      });

      describe('When createTenantForUser is called', () => {
        it('Then it throws the domain error', async () => {
          await expect(
            facade.createTenantForUser({
              userId: 42,
              userUUID: USER_UUID,
              name: 'Mi Tienda',
              businessType: 'retail',
            }),
          ).rejects.toThrow(OnboardingAlreadyCompletedError);
        });
      });
    });
  });
});
