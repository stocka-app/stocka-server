import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { ITenantFacade } from '@tenant/domain/contracts/tenant-facade.contract';
import { IOnboardingFacade } from '@onboarding/domain/contracts/onboarding-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * No-op tenant facade returned when TenantModule is not loaded in the current
 * NestJS context (e.g. isolated e2e worker apps that only boot Auth + User modules).
 * All read operations return null (no tenant) instead of crashing.
 */
const NULL_ONBOARDING_FACADE: IOnboardingFacade = {
  getOnboardingStatus: async (): Promise<null> => null,
};

const NULL_TENANT_FACADE: ITenantFacade = {
  getActiveMembership: async (): Promise<null> => null,
  getMembershipContext: async (): Promise<null> => null,
  getTierLimits: async (): Promise<null> => null,
  createTenantForUser: async (): Promise<never> => {
    throw new Error('TenantFacade not available in this context');
  },
};

@Injectable()
export class MediatorService implements OnModuleInit {
  private _userFacade: IUserFacade | undefined;
  private _tenantFacade: ITenantFacade | undefined;
  private _onboardingFacade: IOnboardingFacade | undefined;
  private _initialized = false;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    this._initialized = true;
    this._userFacade = this.moduleRef.get<IUserFacade>(INJECTION_TOKENS.USER_FACADE, {
      strict: false,
    });
    try {
      this._tenantFacade = this.moduleRef.get<ITenantFacade>(INJECTION_TOKENS.TENANT_FACADE, {
        strict: false,
      });
    } catch {
      this._tenantFacade = undefined;
    }
    try {
      this._onboardingFacade = this.moduleRef.get<IOnboardingFacade>(INJECTION_TOKENS.ONBOARDING_FACADE, {
        strict: false,
      });
    } catch {
      this._onboardingFacade = undefined;
    }
  }

  get user(): IUserFacade {
    if (!this._userFacade) {
      throw new Error('MediatorService not initialized — onModuleInit has not run');
    }
    return this._userFacade;
  }

  get tenant(): ITenantFacade {
    if (!this._initialized) {
      throw new Error('MediatorService not initialized — onModuleInit has not run');
    }
    return this._tenantFacade ?? NULL_TENANT_FACADE;
  }

  get onboarding(): IOnboardingFacade {
    if (!this._initialized) {
      throw new Error('MediatorService not initialized — onModuleInit has not run');
    }
    return this._onboardingFacade ?? NULL_ONBOARDING_FACADE;
  }
}
