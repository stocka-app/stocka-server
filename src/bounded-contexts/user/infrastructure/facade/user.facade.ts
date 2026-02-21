import { Injectable, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserModel } from '@user/domain/models/user.model';
import { CreateUserCommand } from '@user/application/commands/create-user/create-user.command';
import { CreateUserFromSocialCommand } from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import { LinkProviderToUserCommand } from '@user/application/commands/link-provider-to-user/link-provider-to-user.command';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class UserFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async createUser(email: string, username: string, passwordHash: string): Promise<UserModel> {
    return this.commandBus.execute(new CreateUserCommand(email, username, passwordHash));
  }

  async createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<UserModel> {
    return this.commandBus.execute(
      new CreateUserFromSocialCommand(email, username, provider, providerId),
    );
  }

  async findById(id: number): Promise<UserModel | null> {
    return this.userContract.findById(id);
  }

  async findByUUID(uuid: string): Promise<UserModel | null> {
    return this.userContract.findByUUID(uuid);
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.userContract.findByEmail(email);
  }

  async findByEmailOrUsername(identifier: string): Promise<UserModel | null> {
    return this.userContract.findByEmailOrUsername(identifier);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.userContract.existsByEmail(email);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.userContract.existsByUsername(username);
  }

  async updatePasswordHash(uuid: string, newHash: string): Promise<void> {
    const user = await this.userContract.findByUUID(uuid);
    if (user) {
      user.updatePasswordHash(newHash);
      await this.userContract.persist(user);
    }
  }

  async updatePasswordByUserId(userId: number, newHash: string): Promise<void> {
    const user = await this.userContract.findById(userId);
    if (user) {
      user.updatePasswordHash(newHash);
      await this.userContract.persist(user);
    }
  }

  async verifyUserEmail(uuid: string): Promise<void> {
    const user = await this.userContract.findByUUID(uuid);
    if (user) {
      user.verifyEmail();
      await this.userContract.persist(user);
    }
  }

  async blockUserVerification(uuid: string, blockedUntil: Date): Promise<void> {
    const user = await this.userContract.findByUUID(uuid);
    if (user) {
      user.blockVerification(blockedUntil);
      await this.userContract.persist(user);
    }
  }

  async linkProviderToUser(
    userId: number,
    provider: string,
    providerId: string,
  ): Promise<void> {
    return this.commandBus.execute(
      new LinkProviderToUserCommand(userId, provider, providerId),
    );
  }
}
