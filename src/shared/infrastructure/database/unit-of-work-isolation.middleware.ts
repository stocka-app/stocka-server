import { Injectable, Inject, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * UnitOfWorkIsolationMiddleware — ALS scope isolation per HTTP request.
 *
 * Wraps every incoming request in `als.run(undefined, next)` so that
 * any `enterWith(qr)` called during the request lifecycle only affects
 * the isolated async context — never the parent socket context.
 *
 * Without this middleware, `enterWith()` modifies the async context of the
 * TCP socket itself, causing subsequent HTTP requests on the same keep-alive
 * connection to inherit a released QueryRunner (→ 500 error).
 */
@Injectable()
export class UnitOfWorkIsolationMiddleware implements NestMiddleware {
  constructor(
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.uow.runIsolated(next);
  }
}
