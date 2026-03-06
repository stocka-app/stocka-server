import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  FindUserByUUIDQuery,
  FindUserByUUIDQueryResult,
} from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.query';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

@QueryHandler(FindUserByUUIDQuery)
export class FindUserByUUIDHandler implements IQueryHandler<
  FindUserByUUIDQuery,
  FindUserByUUIDQueryResult
> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByUUIDQuery): Promise<FindUserByUUIDQueryResult> {
    const user = await this.userContract.findByUUID(query.uuid);

    if (!user) return err(new UserNotFoundException(query.uuid));

    return ok(user);
  }
}
