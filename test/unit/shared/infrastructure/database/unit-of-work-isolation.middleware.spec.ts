import type { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { UnitOfWorkIsolationMiddleware } from '@shared/infrastructure/database/unit-of-work-isolation.middleware';

describe('UnitOfWorkIsolationMiddleware', () => {
  describe('Given an HTTP request that needs ALS isolation', () => {
    describe('When use() is called', () => {
      it('Then it forwards the next() callback through uow.runIsolated', () => {
        const runIsolated = jest.fn((fn: () => void) => fn());
        const uow = { runIsolated } as unknown as IUnitOfWork;
        const middleware = new UnitOfWorkIsolationMiddleware(uow);
        const next = jest.fn();

        middleware.use({} as never, {} as never, next);

        expect(runIsolated).toHaveBeenCalledWith(next);
        expect(next).toHaveBeenCalled();
      });
    });
  });
});
