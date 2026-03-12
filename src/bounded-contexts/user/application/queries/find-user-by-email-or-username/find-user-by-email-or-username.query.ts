import { IQuery } from '@nestjs/cqrs';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';

export class FindUserByEmailOrUsernameQuery implements IQuery {
  constructor(public readonly identifier: string) {}
}

export type FindUserByEmailOrUsernameQueryResult = Result<UserAggregate | null, DomainException>;
