import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { RbacValidator } from '@common/security/validators/rbac.validator';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';
import {
  ActionNotAllowedError,
  FeatureNotInTierError,
  TierLimitReachedError,
} from '@shared/domain/policy/policy-errors';

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

describe('RbacValidator', () => {
  let validator: RbacValidator;
  let tenantFacade: jest.Mocked<ITenantFacade>;
  let capabilityResolver: jest.Mocked<CapabilityResolver>;

  beforeEach(() => {
    tenantFacade = {
      getMembershipContext: jest.fn(),
      getTierLimits: jest.fn(),
    } as unknown as jest.Mocked<ITenantFacade>;

    capabilityResolver = {
      canPerformAction: jest.fn(),
    } as unknown as jest.Mocked<CapabilityResolver>;

    validator = new RbacValidator(tenantFacade, capabilityResolver);
  });

  describe('Given a membership context is passed directly (from SecurityGuard)', () => {
    const membershipContext = buildMembershipContext();

    describe('When the action is allowed by the policy engine', () => {
      beforeEach(() => {
        capabilityResolver.canPerformAction.mockResolvedValue(ok(undefined));
      });

      it('Then it resolves without throwing', async () => {
        await expect(
          validator.validate(buildUser(), SystemAction.STORAGE_READ, membershipContext),
        ).resolves.toBeUndefined();
      });

      it('Then it does not call getMembershipContext (uses passed context)', async () => {
        await validator.validate(buildUser(), SystemAction.STORAGE_READ, membershipContext);

        expect(tenantFacade.getMembershipContext).not.toHaveBeenCalled();
      });

      it('Then it passes the correct PolicyContext to the resolver', async () => {
        await validator.validate(buildUser(), SystemAction.STORAGE_CREATE, membershipContext);

        expect(capabilityResolver.canPerformAction).toHaveBeenCalledWith({
          tenantTier: 'STARTER',
          userRole: 'OWNER',
          action: SystemAction.STORAGE_CREATE,
          usageCounts: membershipContext.usageCounts,
        });
      });
    });

    describe('When the role does not have the required action', () => {
      beforeEach(() => {
        capabilityResolver.canPerformAction.mockResolvedValue(
          err(new ActionNotAllowedError(SystemAction.STORAGE_CREATE, MemberRoleEnum.VIEWER)),
        );
      });

      it('Then it throws HttpException with 403 and ACTION_NOT_ALLOWED', async () => {
        const promise = validator.validate(
          buildUser(),
          SystemAction.STORAGE_CREATE,
          membershipContext,
        );

        await expect(promise).rejects.toThrow(HttpException);
        await expect(promise).rejects.toMatchObject({
          status: HttpStatus.FORBIDDEN,
        });
        try {
          await validator.validate(buildUser(), SystemAction.STORAGE_CREATE, membershipContext);
        } catch (e) {
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('ACTION_NOT_ALLOWED');
        }
      });
    });

    describe('When the feature is not available in the current tier', () => {
      beforeEach(() => {
        capabilityResolver.canPerformAction.mockResolvedValue(
          err(
            new FeatureNotInTierError(SystemAction.STORAGE_CREATE, TierEnum.FREE, TierEnum.STARTER),
          ),
        );
      });

      it('Then it throws HttpException with 403 and FEATURE_NOT_IN_TIER', async () => {
        try {
          await validator.validate(buildUser(), SystemAction.STORAGE_CREATE, membershipContext);
          fail('Expected to throw');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('FEATURE_NOT_IN_TIER');
        }
      });
    });

    describe('When the tier usage limit has been reached', () => {
      beforeEach(() => {
        capabilityResolver.canPerformAction.mockResolvedValue(
          err(new TierLimitReachedError(SystemAction.STORAGE_CREATE, TierEnum.STARTER, 3, 3)),
        );
      });

      it('Then it throws HttpException with 403 and TIER_LIMIT_REACHED', async () => {
        try {
          await validator.validate(buildUser(), SystemAction.STORAGE_CREATE, membershipContext);
          fail('Expected to throw');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('TIER_LIMIT_REACHED');
        }
      });
    });
  });

  describe('Given no membership context is passed (fallback to facade lookup)', () => {
    describe('When the facade returns null (no membership)', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(null);
      });

      it('Then it throws ForbiddenException with MEMBERSHIP_REQUIRED', async () => {
        await expect(validator.validate(buildUser(), SystemAction.STORAGE_READ)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(
          validator.validate(buildUser(), SystemAction.STORAGE_READ),
        ).rejects.toMatchObject({
          response: { error: 'MEMBERSHIP_REQUIRED' },
        });
      });
    });

    describe('When the facade returns a valid context and the action is allowed', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(buildMembershipContext());
        capabilityResolver.canPerformAction.mockResolvedValue(ok(undefined));
      });

      it('Then it resolves without throwing and uses the fetched context', async () => {
        await expect(
          validator.validate(buildUser(), SystemAction.STORAGE_READ),
        ).resolves.toBeUndefined();

        expect(tenantFacade.getMembershipContext).toHaveBeenCalledWith('user-uuid-123');
      });
    });
  });
});
