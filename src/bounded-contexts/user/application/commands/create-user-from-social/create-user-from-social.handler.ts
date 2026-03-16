import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  CreateUserFromSocialCommand,
  CreateUserFromSocialCommandResult,
} from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from '@shared/domain/result';

/**
 * @deprecated Use UserFacade.createUserFromOAuth() instead.
 * This handler remains for CQRS compatibility but social account creation
 * is now handled transactionally by the UserFacade.
 */
@CommandHandler(CreateUserFromSocialCommand)
export class CreateUserFromSocialHandler implements ICommandHandler<CreateUserFromSocialCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateUserFromSocialCommand): Promise<CreateUserFromSocialCommandResult> {
    let user: UserAggregate;
    try {
      user = UserAggregate.create();
    } catch (e) {
      if (e instanceof DomainException) return err(e);
      throw e;
    }

    const persistedUser = await this.userContract.persist(user);

    this.eventPublisher.mergeObjectContext(user);
    user.commit();

    return ok(persistedUser);
  }
}
