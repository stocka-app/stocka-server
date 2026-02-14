import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindUserByEmailQuery } from '@user/application/queries/find-user-by-email/find-user-by-email.query';
import { UserModel } from '@user/domain/models/user.model';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<FindUserByEmailQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByEmailQuery): Promise<UserModel | null> {
    return this.userContract.findByEmail(query.email);
  }
}
