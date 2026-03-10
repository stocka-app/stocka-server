import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * MediatorService — typed cross-BC communication layer.
 *
 * Uses ModuleRef.get({ strict: false }) to resolve the IUserFacade token
 * at runtime, breaking the circular module dependency (Auth → Mediator → User → Auth).
 * MediatorModule no longer needs to import UserModule.
 *
 * Access namespaced operations via `mediator.user.*`.
 */
@Injectable()
export class MediatorService implements OnModuleInit {
  private _userFacade!: IUserFacade;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    this._userFacade = this.moduleRef.get<IUserFacade>(INJECTION_TOKENS.USER_FACADE, {
      strict: false,
    });
  }

  get user(): IUserFacade {
    return this._userFacade;
  }
}
