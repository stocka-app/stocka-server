import { IQuery } from '@nestjs/cqrs';
import { Result } from '@shared/domain/result';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { UserModel } from '@user/domain/models/user.model';

export class FindUserByUUIDQuery implements IQuery {
  constructor(public readonly uuid: string) {}
}

export type FindUserByUUIDQueryResult = Result<UserModel, UserNotFoundException>;
