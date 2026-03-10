import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

<<<<<<< HEAD
/**
 * MediatorService — typed cross-BC communication layer.
 *
 * Uses ModuleRef.get({ strict: false }) to resolve the IUserFacade token
 * at runtime, breaking the circular module dependency (Auth → Mediator → User → Auth).
 * MediatorModule no longer needs to import UserModule.
 *
 * Access namespaced operations via `mediator.user.*`.
 */
=======
export interface IUserFacade {
  createUser(
    email: string,
    username: string,
    passwordHash: string,
    transactionContext?: unknown,
  ): Promise<unknown>;
  createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<unknown>;
  findById(id: number): Promise<unknown>;
  findByUUID(uuid: string): Promise<unknown>;
  findByEmail(email: string): Promise<unknown>;
  findByEmailOrUsername(identifier: string): Promise<unknown>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  updatePasswordHash(uuid: string, newHash: string): Promise<void>;
  updatePasswordByUserId(userId: number, newHash: string): Promise<void>;
  verifyUserEmail(uuid: string, transactionContext?: unknown): Promise<void>;
  blockUserVerification(uuid: string, blockedUntil: Date): Promise<void>;
  linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void>;
  setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void>;
  findUserBySocialProvider(provider: string, providerId: string): Promise<unknown>;
}

>>>>>>> e4b5c88 (feat(shared): add Unit of Work pattern with TypeORM implementation)
@Injectable()
export class MediatorService implements OnModuleInit {
  private _userFacade!: IUserFacade;

<<<<<<< HEAD
  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    this._userFacade = this.moduleRef.get<IUserFacade>(INJECTION_TOKENS.USER_FACADE, {
      strict: false,
    });
  }

  get user(): IUserFacade {
    return this._userFacade;
=======
  // === USER OPERATIONS ===
  async createUser(
    email: string,
    username: string,
    passwordHash: string,
    transactionContext?: unknown,
  ): Promise<unknown> {
    return this.userFacade.createUser(email, username, passwordHash, transactionContext);
  }

  async createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<unknown> {
    return this.userFacade.createUserFromSocial(email, username, provider, providerId);
  }

  async findUserById(id: number): Promise<unknown> {
    return this.userFacade.findById(id);
  }

  async findUserByUUID(uuid: string): Promise<unknown> {
    return this.userFacade.findByUUID(uuid);
  }

  async findUserByEmail(email: string): Promise<unknown> {
    return this.userFacade.findByEmail(email);
  }

  async findUserByEmailOrUsername(identifier: string): Promise<unknown> {
    return this.userFacade.findByEmailOrUsername(identifier);
  }

  async existsUserByEmail(email: string): Promise<boolean> {
    return this.userFacade.existsByEmail(email);
  }

  async existsUserByUsername(username: string): Promise<boolean> {
    return this.userFacade.existsByUsername(username);
  }

  async updateUserPasswordHash(uuid: string, newHash: string): Promise<void> {
    return this.userFacade.updatePasswordHash(uuid, newHash);
  }

  async updateUserPasswordByUserId(userId: number, newHash: string): Promise<void> {
    return this.userFacade.updatePasswordByUserId(userId, newHash);
  }

  async verifyUserEmail(uuid: string, transactionContext?: unknown): Promise<void> {
    return this.userFacade.verifyUserEmail(uuid, transactionContext);
  }

  async blockUserVerification(uuid: string, blockedUntil: Date): Promise<void> {
    return this.userFacade.blockUserVerification(uuid, blockedUntil);
  }

  async linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void> {
    return this.userFacade.linkProviderToUser(userId, provider, providerId);
  }

  async setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void> {
    return this.userFacade.setPasswordForSocialUser(userId, passwordHash);
  }

  async findUserBySocialProvider(provider: string, providerId: string): Promise<unknown> {
    return this.userFacade.findUserBySocialProvider(provider, providerId);
>>>>>>> e4b5c88 (feat(shared): add Unit of Work pattern with TypeORM implementation)
  }
}
