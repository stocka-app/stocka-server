import { ForbiddenException } from '@nestjs/common';
import { TenantAccessValidator } from '@common/security/validators/tenant-access.validator';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

function buildUser(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    uuid: 'user-uuid-123',
    email: 'test@example.com',
    tenantId: 'tenant-uuid-456',
    role: 'OWNER',
    tierLimits: null,
    ...overrides,
  };
}

function buildMembershipContext(
  overrides: Partial<TenantMembershipContext> = {},
): TenantMembershipContext {
  return {
    tenantUUID: 'tenant-uuid-456',
    role: 'OWNER',
    tenantStatus: 'active',
    tier: 'STARTER',
    usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
    ...overrides,
  };
}

describe('TenantAccessValidator', () => {
  let validator: TenantAccessValidator;
  let getMembershipContext: jest.Mock;
  let mediator: MediatorService;

  beforeEach(() => {
    getMembershipContext = jest.fn();

    mediator = {
      tenant: { getMembershipContext },
    } as unknown as MediatorService;

    validator = new TenantAccessValidator(mediator);
  });

  describe('Given a user with no tenantId in the JWT', () => {
    describe('When the validator runs', () => {
      it('Then it throws ForbiddenException with TENANT_REQUIRED', async () => {
        const user = buildUser({ tenantId: null });

        await expect(validator.validate(user)).rejects.toThrow(ForbiddenException);
        await expect(validator.validate(user)).rejects.toMatchObject({
          response: { error: 'TENANT_REQUIRED' },
        });
      });

      it('Then it does not call getMembershipContext', async () => {
        const user = buildUser({ tenantId: null });

        try {
          await validator.validate(user);
        } catch {
          // expected
        }

        expect(getMembershipContext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a user with tenantId but no active membership in the database', () => {
    beforeEach(() => {
      getMembershipContext.mockResolvedValue(null);
    });

    describe('When the validator runs', () => {
      it('Then it throws ForbiddenException with MEMBERSHIP_REQUIRED', async () => {
        const user = buildUser();

        await expect(validator.validate(user)).rejects.toThrow(ForbiddenException);
        await expect(validator.validate(user)).rejects.toMatchObject({
          response: { error: 'MEMBERSHIP_REQUIRED' },
        });
      });
    });
  });

  describe('Given a user whose tenant is not active (e.g. suspended)', () => {
    beforeEach(() => {
      getMembershipContext.mockResolvedValue(buildMembershipContext({ tenantStatus: 'suspended' }));
    });

    describe('When the validator runs', () => {
      it('Then it throws ForbiddenException with TENANT_NOT_ACTIVE', async () => {
        const user = buildUser();

        await expect(validator.validate(user)).rejects.toThrow(ForbiddenException);
        await expect(validator.validate(user)).rejects.toMatchObject({
          response: { error: 'TENANT_NOT_ACTIVE' },
        });
      });
    });
  });

  describe('Given a user whose tenant is cancelled', () => {
    beforeEach(() => {
      getMembershipContext.mockResolvedValue(buildMembershipContext({ tenantStatus: 'cancelled' }));
    });

    describe('When the validator runs', () => {
      it('Then it throws ForbiddenException with TENANT_NOT_ACTIVE', async () => {
        const user = buildUser();

        await expect(validator.validate(user)).rejects.toThrow(ForbiddenException);
        await expect(validator.validate(user)).rejects.toMatchObject({
          response: { error: 'TENANT_NOT_ACTIVE' },
        });
      });
    });
  });

  describe('Given a user with an active membership in an active tenant', () => {
    const membershipContext = buildMembershipContext();

    beforeEach(() => {
      getMembershipContext.mockResolvedValue(membershipContext);
    });

    describe('When the validator runs', () => {
      it('Then it returns the membership context', async () => {
        const user = buildUser();
        const result = await validator.validate(user);

        expect(result).toEqual(membershipContext);
      });

      it('Then it calls getMembershipContext with the user UUID', async () => {
        const user = buildUser();
        await validator.validate(user);

        expect(getMembershipContext).toHaveBeenCalledWith('user-uuid-123');
      });
    });
  });
});
