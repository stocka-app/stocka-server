import { CommandBus } from '@nestjs/cqrs';
import { TenantFacade } from '@tenant/application/facades/tenant.facade';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { CreateTenantFacadeProps } from '@tenant/domain/contracts/tenant-facade.contract';
import { ok, err } from 'neverthrow';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildActiveMember(tenantId = 1): TenantMemberModel {
  return TenantMemberModel.create({
    tenantId,
    userId: 100,
    userUUID: 'user-uuid-123',
    role: 'OWNER',
  });
}

function buildTenant(overrides: { uuid?: string; status?: string } = {}): TenantAggregate {
  return {
    id: 1,
    uuid: overrides.uuid ?? 'tenant-uuid-abc',
    name: 'Test Biz',
    status: overrides.status ?? 'active',
  } as unknown as TenantAggregate;
}

function buildConfig(tenantId = 1): TenantConfigModel {
  return {
    tenantId,
    tier: { toString: (): string => 'STARTER' },
    storageCount: 2,
    memberCount: 3,
    productCount: 10,
    maxCustomRooms: 5,
    maxStoreRooms: 3,
    maxWarehouses: 3,
  } as unknown as TenantConfigModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TenantFacade', () => {
  let facade: TenantFacade;
  let memberContract: jest.Mocked<ITenantMemberContract>;
  let tenantContract: jest.Mocked<ITenantContract>;
  let configContract: jest.Mocked<ITenantConfigContract>;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(() => {
    memberContract = {
      findActiveByUserUUID: jest.fn(),
      findAllByTenantId: jest.fn(),
      findByTenantAndUserId: jest.fn(),
      persist: jest.fn(),
    };

    tenantContract = {
      findById: jest.fn(),
      findByUUID: jest.fn(),
      findBySlug: jest.fn(),
      persist: jest.fn(),
    };

    configContract = {
      findByTenantId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<ITenantConfigContract>;

    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    facade = new TenantFacade(memberContract, tenantContract, configContract, commandBus);
  });

  // ─── getActiveMembership ─────────────────────────────────────────────────

  describe('Given getActiveMembership is called', () => {
    describe('When no active member exists for the user', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getActiveMembership('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When a member exists but is not active', () => {
      beforeEach(() => {
        const inactiveMember = {
          isActive: jest.fn().mockReturnValue(false),
          tenantId: 1,
          role: { toString: (): string => 'OWNER' },
        } as unknown as TenantMemberModel;
        memberContract.findActiveByUserUUID.mockResolvedValue(inactiveMember);
      });

      it('Then it returns null', async () => {
        const result = await facade.getActiveMembership('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When a member is active but the tenant is not found', () => {
      beforeEach(() => {
        const member = buildActiveMember(1);
        memberContract.findActiveByUserUUID.mockResolvedValue(member);
        tenantContract.findById.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getActiveMembership('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When a member and tenant both exist', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(buildTenant({ uuid: 'tenant-uuid-abc' }));
      });

      it('Then it returns the tenantUUID and role', async () => {
        const result = await facade.getActiveMembership('user-uuid-123');

        expect(result).not.toBeNull();
        expect(result?.tenantUUID).toBe('tenant-uuid-abc');
        expect(result?.role).toBe('OWNER');
      });
    });
  });

  // ─── getMembershipContext ────────────────────────────────────────────────

  describe('Given getMembershipContext is called', () => {
    describe('When no active member exists', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getMembershipContext('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When the tenant is not found', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getMembershipContext('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When the tenant config is not found', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(buildTenant());
        configContract.findByTenantId.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getMembershipContext('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When all data is present', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(buildTenant({ uuid: 'tenant-uuid-abc', status: 'active' }));
        configContract.findByTenantId.mockResolvedValue(buildConfig(1));
      });

      it('Then it returns a complete membership context', async () => {
        const result = await facade.getMembershipContext('user-uuid-123');

        expect(result).not.toBeNull();
        expect(result?.tenantUUID).toBe('tenant-uuid-abc');
        expect(result?.role).toBe('OWNER');
        expect(result?.tenantStatus).toBe('active');
        expect(result?.tier).toBe('STARTER');
        expect(result?.usageCounts.storageCount).toBe(2);
        expect(result?.usageCounts.memberCount).toBe(3);
        expect(result?.usageCounts.productCount).toBe(10);
      });
    });
  });

  // ─── getTierLimits ───────────────────────────────────────────────────────

  describe('Given getTierLimits is called', () => {
    describe('When no active member exists', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getTierLimits('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When the tenant is not found', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getTierLimits('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When the tenant config is not found', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(buildTenant());
        configContract.findByTenantId.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.getTierLimits('user-uuid-123');
        expect(result).toBeNull();
      });
    });

    describe('When all data is present', () => {
      beforeEach(() => {
        memberContract.findActiveByUserUUID.mockResolvedValue(buildActiveMember(1));
        tenantContract.findById.mockResolvedValue(buildTenant());
        configContract.findByTenantId.mockResolvedValue(buildConfig(1));
      });

      it('Then it returns tier limits with correct values', async () => {
        const result = await facade.getTierLimits('user-uuid-123');

        expect(result).not.toBeNull();
        expect(result?.tier).toBe('STARTER');
        expect(result?.maxCustomRooms).toBe(5);
        expect(result?.maxStoreRooms).toBe(3);
        expect(result?.maxWarehouses).toBe(3);
      });
    });
  });

  // ─── createTenantForUser ─────────────────────────────────────────────────

  describe('Given createTenantForUser is called', () => {
    const props: CreateTenantFacadeProps = {
      userUUID: 'user-uuid-123',
      userId: 100,
      name: 'My Business',
      businessType: 'retail',
      country: 'MX',
      timezone: 'America/Mexico_City',
    };

    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(ok({ tenantId: 'new-tenant-uuid', name: 'My Business' }));
      });

      it('Then it returns the tenantUUID from the result', async () => {
        const result = await facade.createTenantForUser(props);
        expect(result.tenantUUID).toBe('new-tenant-uuid');
      });
    });

    describe('When the command uses default country and timezone', () => {
      const propsWithoutOptionals: CreateTenantFacadeProps = {
        userUUID: 'user-uuid-123',
        userId: 100,
        name: 'My Business',
        businessType: 'retail',
      };

      beforeEach(() => {
        commandBus.execute.mockResolvedValue(ok({ tenantId: 'new-tenant-uuid', name: 'My Business' }));
      });

      it('Then it uses MX as default country and Mexico City as default timezone', async () => {
        await facade.createTenantForUser(propsWithoutOptionals);
        const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as {
          country: string;
          timezone: string;
        };
        expect(command.country).toBe('MX');
        expect(command.timezone).toBe('America/Mexico_City');
      });
    });

    describe('When the command fails with a DomainException', () => {
      class TestDomainException extends DomainException {
        constructor() {
          super('TEST_ERROR', 'test error');
        }
      }

      beforeEach(() => {
        commandBus.execute.mockResolvedValue(err(new TestDomainException()));
      });

      it('Then it throws the domain exception', async () => {
        await expect(facade.createTenantForUser(props)).rejects.toBeInstanceOf(TestDomainException);
      });
    });
  });
});
