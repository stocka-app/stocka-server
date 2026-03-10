import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  FindUserByEmailOrUsernameQuery,
  FindUserByEmailOrUsernameQueryResult,
} from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.query';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok } from '@shared/domain/result';

@QueryHandler(FindUserByEmailOrUsernameQuery)
export class FindUserByEmailOrUsernameHandler implements IQueryHandler<
  FindUserByEmailOrUsernameQuery,
  FindUserByEmailOrUsernameQueryResult
> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByEmailOrUsernameQuery): Promise<FindUserByEmailOrUsernameQueryResult> {
    const user = await this.userContract.findByEmailOrUsername(query.identifier);
    return ok(user);
  }
}
