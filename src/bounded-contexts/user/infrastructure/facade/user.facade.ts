import { Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { IUserView } from '@shared/domain/contracts/user-view.contract';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import {
  CreateUserCommand,
  CreateUserCommandResult,
} from '@user/application/commands/create-user/create-user.command';
import {
  CreateUserFromSocialCommand,
  CreateUserFromSocialCommandResult,
} from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import {
  LinkProviderToUserCommand,
  LinkProviderToUserCommandResult,
} from '@user/application/commands/link-provider-to-user/link-provider-to-user.command';
import {
  SetPasswordForSocialUserCommand,
  SetPasswordForSocialUserCommandResult,
} from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.command';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class UserFacade implements IUserFacade {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    @Inject(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT)
    private readonly socialAccountContract: ISocialAccountContract,
  ) {}

  // === Commands ===

  async createUser(email: string, username: string, passwordHash: string): Promise<IUserView> {
    const result = await this.commandBus.execute<CreateUserCommand, CreateUserCommandResult>(
      new CreateUserCommand(email, username, passwordHash),
    );
    return result.match(
      (user) => user,
      (error) => {
        throw error;
      },
    );
  }

  async createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<IUserView> {
    const result = await this.commandBus.execute<
      CreateUserFromSocialCommand,
      CreateUserFromSocialCommandResult
    >(new CreateUserFromSocialCommand(email, username, provider, providerId));
    return result.match(
      (user) => user,
      (error) => {
        throw error;
      },
    );
  }

  async linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void> {
    const result = await this.commandBus.execute<
      LinkProviderToUserCommand,
      LinkProviderToUserCommandResult
    >(new LinkProviderToUserCommand(userId, provider, providerId));
    result.match(
      () => {},
      (error) => {
        throw error;
      },
    );
  }

  async setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void> {
    const result = await this.commandBus.execute<
      SetPasswordForSocialUserCommand,
      SetPasswordForSocialUserCommandResult
    >(new SetPasswordForSocialUserCommand(userId, passwordHash));
    result.match(
      () => {},
      (error) => {
        throw error;
      },
    );
  }

  // === Queries ===

  async findById(id: number): Promise<IUserView | null> {
    return this.userContract.findById(id);
  }

  async findByUUID(uuid: string): Promise<IUserView | null> {
    return this.userContract.findByUUID(uuid);
  }

  async findByEmail(email: string): Promise<IUserView | null> {
    return this.userContract.findByEmail(email);
  }

  async findByEmailOrUsername(identifier: string): Promise<IUserView | null> {
    return this.userContract.findByEmailOrUsername(identifier);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.userContract.existsByEmail(email);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.userContract.existsByUsername(username);
  }

  async findUserBySocialProvider(provider: string, providerId: string): Promise<IUserView | null> {
    const socialAccount = await this.socialAccountContract.findByProviderAndProviderId(
      provider,
      providerId,
    );
    if (!socialAccount) return null;
    return this.userContract.findById(socialAccount.userId);
  }
}
