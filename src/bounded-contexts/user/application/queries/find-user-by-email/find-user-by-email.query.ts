import { IQuery } from '@nestjs/cqrs';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';

export class FindUserByEmailQuery implements IQuery {
  constructor(public readonly email: string) {}
}

export type FindUserByEmailQueryResult = Result<UserAggregate | null, DomainException>;
