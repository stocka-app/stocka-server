import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  FindUserByEmailQuery,
  FindUserByEmailQueryResult,
} from '@user/application/queries/find-user-by-email/find-user-by-email.query';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ok } from '@shared/domain/result';

/**
 * @deprecated Use UserFacade.findUserByEmail() for enriched results (user + credential).
 * Returns only UserAggregate for backward compatibility.
 */
@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  FindUserByEmailQueryResult
> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(query: FindUserByEmailQuery): Promise<FindUserByEmailQueryResult> {
    const result = await this.mediator.user.findUserByEmail(query.email);
    return ok(result?.user ?? null);
  }
}
