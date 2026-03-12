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
 * Usage (handler):
 *   await uow.begin();
 *   try {
 *     await repo.persist(entity);   // repo internally joins the active transaction
 *     await uow.commit();
 *   } catch (error) {
 *     await uow.rollback();
 *     throw error;
 *   }
 */
@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  private readonly logger = new Logger(TypeOrmUnitOfWork.name);
  private readonly als = new AsyncLocalStorage<QueryRunner | undefined>();

  constructor(private readonly dataSource: DataSource) {}

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
      await qr.commitTransaction();
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
      await qr.rollbackTransaction();
    } finally {
      await this.releaseQueryRunner(qr);
    }
  }

  isActive(): boolean {
    return !!this.als.getStore();
  }

  getManager(): EntityManager {
    return this.getActiveRunner().manager;
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
