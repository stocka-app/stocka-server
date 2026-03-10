import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';

export class FindUserByEmailOrUsernameQuery {
  constructor(public readonly identifier: string) {}
}

export type FindUserByEmailOrUsernameQueryResult = Result<UserAggregate | null, DomainException>;
