import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { ITenantFacade } from '@tenant/domain/contracts/tenant-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class MediatorService implements OnModuleInit {
  private _userFacade: IUserFacade | undefined;
  private _tenantFacade: ITenantFacade | undefined;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    this._userFacade = this.moduleRef.get<IUserFacade>(INJECTION_TOKENS.USER_FACADE, {
      strict: false,
    });
    this._tenantFacade = this.moduleRef.get<ITenantFacade>(INJECTION_TOKENS.TENANT_FACADE, {
      strict: false,
    });
  }

  get user(): IUserFacade {
    if (!this._userFacade) {
      throw new Error('MediatorService not initialized — onModuleInit has not run');
    }
    return this._userFacade;
  }

  get tenant(): ITenantFacade {
    if (!this._tenantFacade) {
      throw new Error('MediatorService not initialized — onModuleInit has not run');
    }
    return this._tenantFacade;
  }
}
