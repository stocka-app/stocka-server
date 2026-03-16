import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  FindUserByEmailOrUsernameQuery,
  FindUserByEmailOrUsernameQueryResult,
} from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.query';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ok } from '@shared/domain/result';

/**
 * @deprecated Use UserFacade.findUserByEmailOrUsername() for enriched results (user + credential).
 * Returns only UserAggregate for backward compatibility.
 */
@QueryHandler(FindUserByEmailOrUsernameQuery)
export class FindUserByEmailOrUsernameHandler implements IQueryHandler<
  FindUserByEmailOrUsernameQuery,
  FindUserByEmailOrUsernameQueryResult
> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(
    query: FindUserByEmailOrUsernameQuery,
  ): Promise<FindUserByEmailOrUsernameQueryResult> {
    const result = await this.mediator.user.findUserByEmailOrUsername(query.identifier);
    return ok(result?.user ?? null);
  }
}
