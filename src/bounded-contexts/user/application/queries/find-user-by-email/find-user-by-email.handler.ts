import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  FindUserByEmailQuery,
  FindUserByEmailQueryResult,
} from '@user/application/queries/find-user-by-email/find-user-by-email.query';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok } from '@shared/domain/result';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  FindUserByEmailQueryResult
> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByEmailQuery): Promise<FindUserByEmailQueryResult> {
    const user = await this.userContract.findByEmail(query.email);
    return ok(user);
  }
}
