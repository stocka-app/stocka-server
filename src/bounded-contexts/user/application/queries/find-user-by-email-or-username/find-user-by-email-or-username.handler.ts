import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindUserByEmailOrUsernameQuery } from '@/user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.query';
import { UserModel } from '@/user/domain/models/user.model';
import { IUserContract } from '@/user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';

@QueryHandler(FindUserByEmailOrUsernameQuery)
export class FindUserByEmailOrUsernameHandler implements IQueryHandler<FindUserByEmailOrUsernameQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByEmailOrUsernameQuery): Promise<UserModel | null> {
    return this.userContract.findByEmailOrUsername(query.identifier);
  }
}
