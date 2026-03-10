import { IQuery } from '@nestjs/cqrs';
import { Result } from '@shared/domain/result';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';

export class FindUserByUUIDQuery implements IQuery {
  constructor(public readonly uuid: string) {}
}

export type FindUserByUUIDQueryResult = Result<UserAggregate, UserNotFoundException>;
