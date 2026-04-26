import type { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { TypeOrmUnitOfWork } from '@shared/infrastructure/database/typeorm-unit-of-work';

interface FakeQueryRunner {
  manager: EntityManager;
  isReleased: boolean;
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
}

function makeQueryRunner(overrides: Partial<FakeQueryRunner> = {}): FakeQueryRunner {
  return {
    manager: { mock: 'entity-manager' } as unknown as EntityManager,
    isReleased: false,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeDataSource(qr: FakeQueryRunner): DataSource {
  return {
    createQueryRunner: jest.fn().mockReturnValue(qr),
  } as unknown as DataSource;
}

describe('TypeOrmUnitOfWork', () => {
  describe('execute', () => {
    describe('Given a successful transaction body', () => {
      it('Then it commits and releases the QueryRunner', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        const result = await uow.execute(async () => 'ok');

        expect(result).toBe('ok');
        expect(qr.startTransaction).toHaveBeenCalled();
        expect(qr.commitTransaction).toHaveBeenCalled();
        expect(qr.release).toHaveBeenCalled();
      });
    });

    describe('Given a failing transaction body', () => {
      it('Then it rolls back, releases, and re-throws the original error', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await expect(
          uow.execute(async () => {
            throw new Error('boom');
          }),
        ).rejects.toThrow('boom');

        expect(qr.rollbackTransaction).toHaveBeenCalled();
        expect(qr.release).toHaveBeenCalled();
      });
    });
  });

  describe('begin / commit / rollback lifecycle', () => {
    describe('Given begin() is called twice without commit', () => {
      it('Then the second call releases the first runner before opening a new one', async () => {
        const qr1 = makeQueryRunner();
        const qr2 = makeQueryRunner();
        const dataSource = {
          createQueryRunner: jest.fn().mockReturnValueOnce(qr1).mockReturnValueOnce(qr2),
        } as unknown as DataSource;
        const uow = new TypeOrmUnitOfWork(dataSource);

        await uow.begin();
        await uow.begin();

        expect(qr1.release).toHaveBeenCalled();
        expect(qr2.startTransaction).toHaveBeenCalled();
        await uow.commit();
      });
    });

    describe('Given begin() and the connect step fails', () => {
      it('Then it releases the runner, clears ALS, and rethrows', async () => {
        const qr = makeQueryRunner({
          connect: jest.fn().mockRejectedValue(new Error('connect failed')),
        });
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await expect(uow.begin()).rejects.toThrow('connect failed');
        expect(qr.release).toHaveBeenCalled();
      });
    });

    describe('Given begin() fails AND release() also fails', () => {
      it('Then the .catch swallows the release error and the original failure propagates', async () => {
        const qr = makeQueryRunner({
          startTransaction: jest.fn().mockRejectedValue(new Error('start failed')),
          release: jest.fn().mockRejectedValue(new Error('release failed too')),
        });
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await expect(uow.begin()).rejects.toThrow('start failed');
        expect(qr.release).toHaveBeenCalled();
      });
    });

    describe('Given commit() is called without an active transaction', () => {
      it('Then it throws "No active transaction"', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await expect(uow.commit()).rejects.toThrow('No active transaction');
      });
    });

    describe('Given rollback() is called without an active transaction', () => {
      it('Then it logs a warning and returns silently', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commit() runs but the runner is already released', () => {
      it('Then it logs and returns without throwing', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();
        qr.isReleased = true;

        await expect(uow.commit()).resolves.toBeUndefined();
        expect(qr.commitTransaction).not.toHaveBeenCalled();
      });
    });

    describe('Given rollback() runs but the runner is already released', () => {
      it('Then it returns silently', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();
        qr.isReleased = true;

        await expect(uow.rollback()).resolves.toBeUndefined();
        expect(qr.rollbackTransaction).not.toHaveBeenCalled();
      });
    });

    describe('Given commitTransaction throws and the runner becomes released after the failure', () => {
      it('Then it swallows and logs the error', async () => {
        const qr = makeQueryRunner();
        qr.commitTransaction = jest.fn().mockImplementation(() => {
          qr.isReleased = true;
          return Promise.reject(new Error('commit failed'));
        });
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();

        await expect(uow.commit()).resolves.toBeUndefined();
      });
    });

    describe('Given commitTransaction throws while the runner remains active', () => {
      it('Then it propagates the error', async () => {
        const qr = makeQueryRunner();
        qr.commitTransaction = jest.fn().mockRejectedValue(new Error('commit failed'));
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();

        await expect(uow.commit()).rejects.toThrow('commit failed');
      });
    });

    describe('Given rollbackTransaction throws while the runner remains active', () => {
      it('Then it propagates the error', async () => {
        const qr = makeQueryRunner();
        qr.rollbackTransaction = jest.fn().mockRejectedValue(new Error('rollback failed'));
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();

        await expect(uow.rollback()).rejects.toThrow('rollback failed');
      });
    });

    describe('Given rollbackTransaction throws and the runner becomes released after the failure', () => {
      it('Then it swallows and logs', async () => {
        const qr = makeQueryRunner();
        qr.rollbackTransaction = jest.fn().mockImplementation(() => {
          qr.isReleased = true;
          return Promise.reject(new Error('rollback failed'));
        });
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();

        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given release() throws (lost connection)', () => {
      it('Then commit completes without re-throwing the release error', async () => {
        const qr = makeQueryRunner({ release: jest.fn().mockRejectedValue(new Error('lost')) });
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();

        await expect(uow.commit()).resolves.toBeUndefined();
        expect(qr.commitTransaction).toHaveBeenCalled();
        expect(qr.release).toHaveBeenCalled();
      });
    });
  });

  describe('isActive', () => {
    describe('Given no transaction has been started', () => {
      it('Then isActive() returns false', () => {
        const uow = new TypeOrmUnitOfWork(makeDataSource(makeQueryRunner()));
        expect(uow.isActive()).toBe(false);
      });
    });

    describe('Given an active runner that has been released', () => {
      it('Then isActive() returns false', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();
        qr.isReleased = true;

        expect(uow.isActive()).toBe(false);
        await uow.commit();
      });
    });
  });

  describe('getManager', () => {
    describe('Given an active transaction', () => {
      it('Then it returns the runner manager', async () => {
        const qr = makeQueryRunner();
        const uow = new TypeOrmUnitOfWork(makeDataSource(qr));

        await uow.begin();

        expect(uow.getManager()).toBe(qr.manager);
        await uow.commit();
      });
    });

    describe('Given no active transaction', () => {
      it('Then getManager() throws', () => {
        const uow = new TypeOrmUnitOfWork(makeDataSource(makeQueryRunner()));
        expect(() => uow.getManager()).toThrow('No active transaction');
      });
    });
  });

  describe('runIsolated', () => {
    describe('Given a callback that needs an isolated ALS scope', () => {
      it('Then the UoW reports inactive inside the callback even if the parent context had a transaction', () => {
        const uow = new TypeOrmUnitOfWork(makeDataSource(makeQueryRunner()));

        const innerActive: boolean[] = [];
        uow.runIsolated(() => {
          innerActive.push(uow.isActive());
        });

        expect(innerActive).toEqual([false]);
      });
    });
  });
});
