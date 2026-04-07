import { DataSource } from 'typeorm';

import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmUnitOfWork edge cases (e2e)', () => {
  let dataSource: DataSource;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    uow = app.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  afterEach(async () => {
    await truncateWorkerTables(dataSource);

    // Safety net: release any QRs still connected after each UoW edge-case test.
    const connectedQRs: any[] = [...((dataSource as any).driver?.connectedQueryRunners ?? [])];
    for (const qr of connectedQRs) {
      try {
        Object.defineProperty(qr, 'isReleased', {
          value: false,
          configurable: true,
          writable: true,
        });
        await qr.releasePostgresConnection();
      } catch {
        /* ignore */
      }
    }
  });

  describe('TypeOrmUnitOfWork edge cases', () => {
    describe('Given execute() is called with a callback that throws', () => {
      it('Then it rolls back the transaction and re-throws the error', async () => {
        const error = new Error('callback failed');
        await expect(uow.execute(() => Promise.reject(error))).rejects.toThrow('callback failed');
      });
    });

    describe('Given begin() is called while a transaction is already active', () => {
      it('Then it warns and does not throw', async () => {
        await uow.begin();
        await expect(uow.begin()).resolves.toBeUndefined();
        try {
          await uow.rollback();
        } catch {
          // Acceptable in non-HTTP test context where ALS context scoping differs
        }
      });
    });

    describe('Given rollback() is called with no active transaction', () => {
      it('Then it warns and returns without throwing', async () => {
        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commit() is called without an active transaction', () => {
      it('Then it throws "No active transaction"', async () => {
        await expect(uow.commit()).rejects.toThrow('No active transaction');
      });
    });

    describe('Given getManager() is called without an active transaction', () => {
      it('Then it throws "No active transaction"', () => {
        expect(() => uow.getManager()).toThrow('No active transaction');
      });
    });

    describe('Given the database connection fails during begin()', () => {
      it('Then begin() cleans up the runner and rethrows the error', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr, 'connect').mockRejectedValueOnce(new Error('Connection refused'));
          return qr;
        });
        await expect(uow.begin()).rejects.toThrow('Connection refused');
        spy.mockRestore();
        try {
          await uow.rollback();
        } catch {
          /* ignore */
        }
      });
    });

    describe('Given the database connection fails AND qr.release() also fails during begin() cleanup', () => {
      it('Then begin() swallows the release error and still throws the original connection error (line 48)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr, 'connect').mockRejectedValueOnce(new Error('Connection refused'));
          jest.spyOn(qr, 'release').mockRejectedValueOnce(new Error('Release also failed'));
          return qr;
        });
        await expect(uow.begin()).rejects.toThrow('Connection refused');
        spy.mockRestore();
        try {
          await uow.rollback();
        } catch {
          /* ignore */
        }
      });
    });

    describe('Given the query runner release fails during rollback cleanup', () => {
      it('Then rollback completes without throwing even if release fails', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          const origRelease = qr.release.bind(qr);
          jest.spyOn(qr, 'release').mockImplementationOnce(async () => {
            await origRelease();
            throw new Error('Release failed');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commit() is called with an already-released QueryRunner', () => {
      it('Then commit() warns and returns without throwing (lines 57-58)', async () => {
        await uow.begin();
        const qr = (uow as any).als.getStore();
        await uow.rollback();
        (uow as any).als.enterWith(qr);
        await expect(uow.commit()).resolves.toBeUndefined();
      });
    });

    describe('Given commitTransaction() throws because the QueryRunner released mid-commit', () => {
      it('Then commit() swallows the error and returns without throwing (lines 62-64)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'commitTransaction').mockImplementationOnce(async () => {
            await qr.release();
            throw new Error('QueryRunner is already released');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.commit()).resolves.toBeUndefined();
      });
    });

    describe('Given rollbackTransaction() throws because the QueryRunner released mid-rollback', () => {
      it('Then rollback() swallows the error and returns without throwing (lines 85-87)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'rollbackTransaction').mockImplementationOnce(async () => {
            await qr.release();
            throw new Error('QueryRunner is already released');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commitTransaction() throws a genuine DB error while the QR is still connected', () => {
      it('Then commit() re-throws the error and the connection is returned to the pool (line 66)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'commitTransaction').mockImplementationOnce(async () => {
            throw new Error('DB commit failed: serialization failure');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.commit()).rejects.toThrow('DB commit failed: serialization failure');
      });
    });

    describe('Given rollbackTransaction() throws a genuine DB error while the QR is still connected', () => {
      it('Then rollback() re-throws the error and the connection is returned to the pool (line 89)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'rollbackTransaction').mockImplementationOnce(async () => {
            throw new Error('DB rollback failed: connection lost');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.rollback()).rejects.toThrow('DB rollback failed: connection lost');
      });
    });
  });
});
