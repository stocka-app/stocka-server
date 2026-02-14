import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindUserByUuidQuery } from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.query';
import { UserModel } from '@user/domain/models/user.model';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@QueryHandler(FindUserByUuidQuery)
export class FindUserByUuidHandler implements IQueryHandler<FindUserByUuidQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByUuidQuery): Promise<UserModel> {
    const user = await this.userContract.findByUuid(query.uuid);

    if (!user) {
      throw new UserNotFoundException(query.uuid);
    }

    return user;
  }
}
