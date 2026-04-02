import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';

/**
 * TypeOrmUnitOfWork — transactional boundary using TypeORM QueryRunner.
 *
 * Uses AsyncLocalStorage to scope the QueryRunner per async execution context.
 * This allows the UoW to be a **singleton** while still isolating transactions
 * per request. Repositories inject this singleton and call isActive()/getManager()
 * internally — the handler never passes the manager around.
 *
 * Usage (handler — preferred):
 *   const result = await uow.execute(async () => {
 *     await repo.persist(entity);   // repo internally joins the active transaction
 *     return result;
 *   });
 */
@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  private readonly logger = new Logger(TypeOrmUnitOfWork.name);
  private readonly als = new AsyncLocalStorage<QueryRunner | undefined>();

  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.begin();
    try {
      const result = await fn();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async begin(): Promise<void> {
    const existing = this.als.getStore();
    if (existing) {
      this.logger.warn('begin() called while a transaction is already active — releasing previous');
      await this.releaseQueryRunner(existing);
    }
    const qr = this.dataSource.createQueryRunner();
    // enterWith BEFORE any await so it sets the store in the current synchronous
    // execution context (shared with the caller). Setting it after the first await
    // only affects begin()'s own continuation context, not the caller's context.
    this.als.enterWith(qr);

    try {
      await qr.connect();
      await qr.startTransaction();
    } catch (error) {
      this.als.enterWith(undefined);
      await qr.release().catch(() => {});
      throw error;
    }
  }

  async commit(): Promise<void> {
    const qr = this.getActiveRunner();
    try {
      if (qr.isReleased) {
        this.logger.warn('commit() called with a released QueryRunner — ignoring');
        return;
      }
      await qr.commitTransaction();
    } catch (error) {
      if (qr.isReleased) {
        this.logger.warn('commit() failed because QueryRunner is already released — ignoring');
        return;
      }
      throw error;
    } finally {
      await this.releaseQueryRunner(qr);
    }
  }

  async rollback(): Promise<void> {
    const qr = this.als.getStore();
    if (!qr) {
      this.logger.warn('rollback() called with no active transaction — ignoring');
      return;
    }
    try {
      if (qr.isReleased) {
        this.logger.warn('rollback() called with a released QueryRunner — ignoring');
        return;
      }
      await qr.rollbackTransaction();
    } catch (error) {
      if (qr.isReleased) {
        this.logger.warn('rollback() failed because QueryRunner is already released — ignoring');
        return;
      }
      throw error;
    } finally {
      await this.releaseQueryRunner(qr);
    }
  }

  isActive(): boolean {
    const qr = this.als.getStore();
    return !!qr && !qr.isReleased;
  }

  getManager(): EntityManager {
    return this.getActiveRunner().manager;
  }

  runIsolated(fn: () => void): void {
    this.als.run(undefined, fn);
  }

  private getActiveRunner(): QueryRunner {
    const qr = this.als.getStore();
    if (!qr) {
      throw new Error('No active transaction. Call begin() first.');
    }
    return qr;
  }

  private async releaseQueryRunner(qr: QueryRunner): Promise<void> {
    try {
      await qr.release();
    } catch {
      this.logger.warn('QueryRunner release failed — already released or connection lost');
    }
    this.als.enterWith(undefined);
  }
}
