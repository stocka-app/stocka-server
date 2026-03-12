import { ICommand } from '@nestjs/cqrs';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';

export class CreateUserFromSocialCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly provider: string,
    public readonly providerId: string,
  ) {}
}

export type CreateUserFromSocialCommandResult = Result<UserAggregate, DomainException>;
