import { HttpException, HttpStatus } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { RbacValidator } from '@authorization/infrastructure/validators/rbac.validator';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@authorization/domain/services/capability.resolver';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import {
  ActionNotAllowedError,
  FeatureNotInTierError,
  TierLimitReachedError,
} from '@authorization/domain/errors/policy-errors';

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
  let capabilityResolver: jest.Mocked<CapabilityResolver>;

  beforeEach(() => {
    capabilityResolver = {
      canPerformAction: jest.fn(),
    } as unknown as jest.Mocked<CapabilityResolver>;

    validator = new RbacValidator(capabilityResolver);
  });

  describe('Given a membership context is passed (from SecurityGuard)', () => {
    const membershipContext = buildMembershipContext();

    describe('When the action is allowed by the policy engine', () => {
      beforeEach(() => {
        capabilityResolver.canPerformAction.mockResolvedValue(ok(undefined));
      });

      it('Then it resolves without throwing', async () => {
        await expect(
          validator.validate(SystemAction.STORAGE_READ, membershipContext),
        ).resolves.toBeUndefined();
      });

      it('Then it passes the correct PolicyContext to the resolver', async () => {
        await validator.validate(SystemAction.STORAGE_CREATE, membershipContext);

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
        const promise = validator.validate(SystemAction.STORAGE_CREATE, membershipContext);

        await expect(promise).rejects.toThrow(HttpException);
        await expect(promise).rejects.toMatchObject({
          status: HttpStatus.FORBIDDEN,
        });
        try {
          await validator.validate(SystemAction.STORAGE_CREATE, membershipContext);
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

      it('Then it throws HttpException with 403 and PLAN_UPGRADE_REQUIRED', async () => {
        try {
          await validator.validate(SystemAction.STORAGE_CREATE, membershipContext);
          fail('Expected to throw');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('PLAN_UPGRADE_REQUIRED');
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
          await validator.validate(SystemAction.STORAGE_CREATE, membershipContext);
          fail('Expected to throw');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('TIER_LIMIT_REACHED');
        }
      });
    });
  });
});
