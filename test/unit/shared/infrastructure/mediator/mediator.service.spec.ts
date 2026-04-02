import { ModuleRef } from '@nestjs/core';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('MediatorService', () => {
  const fakeUserFacade = { findByUUID: jest.fn() } as any;
  const fakeTenantFacade = { getActiveMembership: jest.fn() } as any;
  const fakeOnboardingFacade = { getOnboardingStatus: jest.fn() } as any;

  function buildModuleRef(overrides: Record<string, any> = {}): ModuleRef {
    const providers: Record<string, any> = {
      [INJECTION_TOKENS.USER_FACADE]: fakeUserFacade,
      [INJECTION_TOKENS.TENANT_FACADE]: fakeTenantFacade,
      [INJECTION_TOKENS.ONBOARDING_FACADE]: fakeOnboardingFacade,
      ...overrides,
    };

    return {
      get: jest.fn((token: string) => {
        if (token in providers) {
          const val = providers[token];
          if (val instanceof Error) throw val;
          return val;
        }
        throw new Error(`Provider ${token} not found`);
      }),
    } as unknown as ModuleRef;
  }

  // ── Pre-init guard branches ──────────────────────────────────────

  describe('Given MediatorService before onModuleInit', () => {
    let service: MediatorService;

    beforeEach(() => {
      service = new MediatorService(buildModuleRef());
    });

    describe('When accessing .user', () => {
      it('Then it throws because the service is not initialized', () => {
        expect(() => service.user).toThrow('MediatorService not initialized');
      });
    });

    describe('When accessing .tenant', () => {
      it('Then it throws because the service is not initialized', () => {
        expect(() => service.tenant).toThrow('MediatorService not initialized');
      });
    });

    describe('When accessing .onboarding', () => {
      it('Then it throws because the service is not initialized', () => {
        expect(() => service.onboarding).toThrow('MediatorService not initialized');
      });
    });
  });

  // ── Post-init happy path ─────────────────────────────────────────

  describe('Given MediatorService after onModuleInit with all modules available', () => {
    let service: MediatorService;

    beforeEach(() => {
      service = new MediatorService(buildModuleRef());
      service.onModuleInit();
    });

    describe('When accessing .user', () => {
      it('Then it returns the resolved UserFacade', () => {
        expect(service.user).toBe(fakeUserFacade);
      });
    });

    describe('When accessing .tenant', () => {
      it('Then it returns the resolved TenantFacade', () => {
        expect(service.tenant).toBe(fakeTenantFacade);
      });
    });

    describe('When accessing .onboarding', () => {
      it('Then it returns the resolved OnboardingFacade', () => {
        expect(service.onboarding).toBe(fakeOnboardingFacade);
      });
    });
  });

  // ── Fallback to NULL_TENANT_FACADE ───────────────────────────────

  describe('Given MediatorService when TenantModule is NOT loaded', () => {
    let service: MediatorService;

    beforeEach(() => {
      const moduleRef = buildModuleRef({
        [INJECTION_TOKENS.TENANT_FACADE]: new Error('Not found'),
      });
      service = new MediatorService(moduleRef);
      service.onModuleInit();
    });

    describe('When accessing .tenant', () => {
      it('Then it returns the NULL_TENANT_FACADE (not undefined)', () => {
        expect(service.tenant).toBeDefined();
      });
    });

    describe('When calling getActiveMembership on null facade', () => {
      it('Then it returns null', async () => {
        const result = await service.tenant.getActiveMembership('any-uuid');
        expect(result).toBeNull();
      });
    });

    describe('When calling getMembershipContext on null facade', () => {
      it('Then it returns null', async () => {
        const result = await service.tenant.getMembershipContext('any-uuid');
        expect(result).toBeNull();
      });
    });

    describe('When calling getTierLimits on null facade', () => {
      it('Then it returns null', async () => {
        const result = await service.tenant.getTierLimits('any-uuid');
        expect(result).toBeNull();
      });
    });

    describe('When calling getTierLimitsByTenantUUID on null facade', () => {
      it('Then it returns null', async () => {
        const result = await service.tenant.getTierLimitsByTenantUUID('any-tenant-uuid');
        expect(result).toBeNull();
      });
    });

    describe('When calling createTenantForUser on null facade', () => {
      it('Then it throws "not available"', async () => {
        await expect(
          service.tenant.createTenantForUser({
            userUUID: 'uuid',
            userId: 1,
            name: 'Test',
            businessType: 'retail',
          }),
        ).rejects.toThrow('TenantFacade not available in this context');
      });
    });
  });

  // ── Fallback to NULL_ONBOARDING_FACADE ───────────────────────────

  describe('Given MediatorService when OnboardingModule is NOT loaded', () => {
    let service: MediatorService;

    beforeEach(() => {
      const moduleRef = buildModuleRef({
        [INJECTION_TOKENS.ONBOARDING_FACADE]: new Error('Not found'),
      });
      service = new MediatorService(moduleRef);
      service.onModuleInit();
    });

    describe('When accessing .onboarding', () => {
      it('Then it returns the NULL_ONBOARDING_FACADE (not undefined)', () => {
        expect(service.onboarding).toBeDefined();
      });
    });

    describe('When calling getOnboardingStatus on null facade', () => {
      it('Then it returns null', async () => {
        const result = await service.onboarding.getOnboardingStatus('any-uuid');
        expect(result).toBeNull();
      });
    });
  });
});
