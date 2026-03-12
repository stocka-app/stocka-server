import { Logger } from '@nestjs/common';
import { Saga } from '@shared/domain/saga/saga.base';
import { ISagaStepHandler } from '@shared/domain/saga/saga-step-handler.interface';
import { SagaStepConfig } from '@shared/domain/saga/saga-step-config.interface';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';

interface TestContext {
  input: string;
  step1Done?: boolean;
  step2Done?: boolean;
  postCommitDone?: boolean;
}

/** Reusable helper to create a step handler from a function. */
function handler(
  fn: (ctx: TestContext) => void | Promise<void>,
  comp?: (ctx: TestContext) => void | Promise<void>,
): ISagaStepHandler<TestContext> {
  return {
    execute: (ctx) => Promise.resolve().then(() => fn(ctx)),
    compensate: comp ? (ctx) => Promise.resolve().then(() => comp(ctx)) : undefined,
  };
}

class TestSaga extends Saga<TestContext> {
  protected readonly processName = 'test-saga';
  protected readonly logger = new Logger(TestSaga.name);

  private steps: SagaStepConfig<TestContext>[] = [];

  setSteps(steps: SagaStepConfig<TestContext>[]) {
    this.steps = steps;
  }

  protected defineSteps(): SagaStepConfig<TestContext>[] {
    return this.steps;
  }
}

describe('Saga Base', () => {
  let saga: TestSaga;
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    uow = {
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      isActive: jest.fn().mockReturnValue(false),
      getManager: jest.fn(),
    } as jest.Mocked<IUnitOfWork>;

    saga = new TestSaga(uow);
  });

  describe('run()', () => {
    it('should execute transaction steps inside UoW and commit', async () => {
      saga.setSteps([
        {
          name: 'step-1',
          handler: handler((ctx) => {
            ctx.step1Done = true;
          }),
        },
        {
          name: 'step-2',
          handler: handler((ctx) => {
            ctx.step2Done = true;
          }),
        },
      ]);

      const ctx = await saga.run({ input: 'test' });

      expect(uow.begin).toHaveBeenCalledTimes(1);
      expect(ctx.step1Done).toBe(true);
      expect(ctx.step2Done).toBe(true);
      expect(uow.commit).toHaveBeenCalledTimes(1);
      expect(uow.rollback).not.toHaveBeenCalled();
    });

    it('should execute steps in sequential order', async () => {
      const order: string[] = [];
      saga.setSteps([
        {
          name: 'first',
          handler: handler(() => {
            order.push('first');
          }),
        },
        {
          name: 'second',
          handler: handler(() => {
            order.push('second');
          }),
        },
        {
          name: 'third',
          handler: handler(() => {
            order.push('third');
          }),
        },
      ]);

      await saga.run({ input: 'test' });

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('should rollback on transaction step failure and rethrow', async () => {
      saga.setSteps([
        {
          name: 'step-1',
          handler: handler((ctx) => {
            ctx.step1Done = true;
          }),
        },
        {
          name: 'step-2-fails',
          handler: handler(() => {
            throw new Error('Unique constraint violated');
          }),
        },
      ]);

      await expect(saga.run({ input: 'test' })).rejects.toThrow('Unique constraint violated');
      expect(uow.begin).toHaveBeenCalledTimes(1);
      expect(uow.rollback).toHaveBeenCalledTimes(1);
      expect(uow.commit).not.toHaveBeenCalled();
    });

    it('should not execute post-commit steps when transaction fails', async () => {
      let postCommitCalled = false;
      saga.setSteps([
        {
          name: 'fails',
          handler: handler(() => {
            throw new Error('DB down');
          }),
        },
        {
          name: 'publish',
          handler: handler(() => {
            postCommitCalled = true;
          }),
          transactional: false,
        },
      ]);

      await expect(saga.run({ input: 'test' })).rejects.toThrow('DB down');
      expect(postCommitCalled).toBe(false);
    });

    it('should run post-commit steps after successful commit', async () => {
      saga.setSteps([
        {
          name: 'persist',
          handler: handler((ctx) => {
            ctx.step1Done = true;
          }),
        },
        {
          name: 'publish',
          handler: handler((ctx) => {
            ctx.postCommitDone = true;
          }),
          transactional: false,
        },
      ]);

      const ctx = await saga.run({ input: 'test' });

      expect(uow.commit).toHaveBeenCalledTimes(1);
      expect(ctx.postCommitDone).toBe(true);
    });

    it('should swallow post-commit step failures without throwing', async () => {
      saga.setSteps([
        {
          name: 'persist',
          handler: handler((ctx) => {
            ctx.step1Done = true;
          }),
        },
        {
          name: 'broken-publish',
          handler: handler(() => {
            throw new Error('Event bus unavailable');
          }),
          transactional: false,
        },
      ]);

      const ctx = await saga.run({ input: 'test' });

      expect(ctx.step1Done).toBe(true);
      expect(uow.commit).toHaveBeenCalledTimes(1);
    });

    it('should return the mutated context', async () => {
      saga.setSteps([
        {
          name: 'enrich',
          handler: handler((ctx) => {
            ctx.step1Done = true;
            ctx.step2Done = true;
          }),
        },
      ]);

      const ctx = await saga.run({ input: 'original' });

      expect(ctx.input).toBe('original');
      expect(ctx.step1Done).toBe(true);
      expect(ctx.step2Done).toBe(true);
    });

    it('should work with no transactional steps (all post-commit)', async () => {
      saga.setSteps([
        {
          name: 'publish',
          handler: handler((ctx) => {
            ctx.postCommitDone = true;
          }),
          transactional: false,
        },
      ]);

      const ctx = await saga.run({ input: 'test' });

      expect(uow.begin).not.toHaveBeenCalled();
      expect(ctx.postCommitDone).toBe(true);
    });
  });

  describe('compensation', () => {
    it('should call compensate on completed steps in reverse order on failure', async () => {
      const compensations: string[] = [];
      saga.setSteps([
        {
          name: 'step-A',
          handler: handler(
            (ctx) => {
              ctx.step1Done = true;
            },
            () => {
              compensations.push('comp-A');
            },
          ),
        },
        {
          name: 'step-B',
          handler: handler(
            (ctx) => {
              ctx.step2Done = true;
            },
            () => {
              compensations.push('comp-B');
            },
          ),
        },
        {
          name: 'step-C-fails',
          handler: handler(() => {
            throw new Error('Boom');
          }),
        },
      ]);

      await expect(saga.run({ input: 'test' })).rejects.toThrow('Boom');

      // step-A and step-B completed before step-C failed
      // Compensation should run in reverse: B then A
      expect(compensations).toEqual(['comp-B', 'comp-A']);
    });

    it('should skip compensation for steps without compensate method', async () => {
      const compensations: string[] = [];
      saga.setSteps([
        { name: 'no-comp', handler: handler(() => {}) },
        {
          name: 'has-comp',
          handler: handler(
            () => {},
            () => {
              compensations.push('compensated');
            },
          ),
        },
        {
          name: 'fails',
          handler: handler(() => {
            throw new Error('Fail');
          }),
        },
      ]);

      await expect(saga.run({ input: 'test' })).rejects.toThrow('Fail');
      expect(compensations).toEqual(['compensated']);
    });

    it('should continue compensation even if one compensate() throws', async () => {
      const compensations: string[] = [];
      saga.setSteps([
        {
          name: 'step-1',
          handler: handler(
            () => {},
            () => {
              compensations.push('comp-1');
            },
          ),
        },
        {
          name: 'step-2',
          handler: handler(
            () => {},
            () => {
              throw new Error('Compensation failed');
            },
          ),
        },
        {
          name: 'step-3',
          handler: handler(
            () => {},
            () => {
              compensations.push('comp-3');
            },
          ),
        },
        {
          name: 'fails',
          handler: handler(() => {
            throw new Error('Boom');
          }),
        },
      ]);

      await expect(saga.run({ input: 'test' })).rejects.toThrow('Boom');

      // step-2 compensation fails but step-3 (runs first, reverse order) and step-1 still run
      expect(compensations).toContain('comp-3');
      expect(compensations).toContain('comp-1');
    });
  });

  describe('retry', () => {
    it('should retry a step according to its retry policy', async () => {
      let attempts = 0;
      saga.setSteps([
        {
          name: 'flaky-step',
          handler: handler((ctx) => {
            attempts++;
            if (attempts < 3) throw new Error('Transient failure');
            ctx.step1Done = true;
          }),
          retry: { maxAttempts: 3, backoffMs: 1 },
        },
      ]);

      const ctx = await saga.run({ input: 'test' });

      expect(attempts).toBe(3);
      expect(ctx.step1Done).toBe(true);
    });

    it('should fail the saga when retries are exhausted', async () => {
      saga.setSteps([
        {
          name: 'always-fails',
          handler: handler(() => {
            throw new Error('Persistent failure');
          }),
          retry: { maxAttempts: 2, backoffMs: 1 },
        },
      ]);

      await expect(saga.run({ input: 'test' })).rejects.toThrow();
      expect(uow.rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('ProcessManager state tracking', () => {
    it('should track state transitions through ProcessManager lifecycle', async () => {
      saga.setSteps([
        {
          name: 'step-1',
          handler: handler((ctx) => {
            ctx.step1Done = true;
          }),
        },
      ]);

      // The saga should not throw and should clean up internal state
      const ctx = await saga.run({ input: 'test' });
      expect(ctx.step1Done).toBe(true);

      // After run completes, in-memory state should be cleaned up
      const state = await saga.findByCorrelationId('any');
      expect(state).toBeNull();
    });
  });
});
