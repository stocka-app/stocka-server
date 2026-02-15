import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindUserByUUIDQuery } from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.query';
import { UserModel } from '@user/domain/models/user.model';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@QueryHandler(FindUserByUUIDQuery)
export class FindUserByUUIDHandler implements IQueryHandler<FindUserByUUIDQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async execute(query: FindUserByUUIDQuery): Promise<UserModel> {
    const user = await this.userContract.findByUUID(query.uuid);

    if (!user) {
      throw new UserNotFoundException(query.uuid);
    }

    return user;
  }
}
