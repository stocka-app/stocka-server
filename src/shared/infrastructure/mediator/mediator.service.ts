import { Injectable, Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

export interface IUserFacade {
  createUser(email: string, username: string, passwordHash: string): Promise<unknown>;
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
  verifyUserEmail(uuid: string): Promise<void>;
  blockUserVerification(uuid: string, blockedUntil: Date): Promise<void>;
  linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void>;
  setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void>;
}

@Injectable()
export class MediatorService {
  constructor(@Inject(INJECTION_TOKENS.USER_FACADE) private readonly userFacade: IUserFacade) {}

  // === USER OPERATIONS ===
  async createUser(email: string, username: string, passwordHash: string): Promise<unknown> {
    return this.userFacade.createUser(email, username, passwordHash);
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

  async verifyUserEmail(uuid: string): Promise<void> {
    return this.userFacade.verifyUserEmail(uuid);
  }

  async blockUserVerification(uuid: string, blockedUntil: Date): Promise<void> {
    return this.userFacade.blockUserVerification(uuid, blockedUntil);
  }

  async linkProviderToUser(
    userId: number,
    provider: string,
    providerId: string,
  ): Promise<void> {
    return this.userFacade.linkProviderToUser(userId, provider, providerId);
  }

  async setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void> {
    return this.userFacade.setPasswordForSocialUser(userId, passwordHash);
  }
}
