import { Injectable, Logger, Scope } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';

/**
 * TypeOrmUnitOfWork — transactional boundary using TypeORM QueryRunner.
 *
 * Scoped as REQUEST so each HTTP request gets its own instance.
 * The QueryRunner is created lazily on begin() and released on commit/rollback.
 *
 * Usage:
 *   await uow.begin();
 *   try {
 *     repo.persist(entity, uow.getManager() as EntityManager);
 *     await uow.commit();
 *   } catch (error) {
 *     await uow.rollback();
 *     throw error;
 *   }
 */
@Injectable({ scope: Scope.REQUEST })
export class TypeOrmUnitOfWork implements IUnitOfWork {
  private readonly logger = new Logger(TypeOrmUnitOfWork.name);
  private queryRunner: QueryRunner | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async begin(): Promise<void> {
    if (this.queryRunner) {
      this.logger.warn('begin() called while a transaction is already active — releasing previous');
      await this.releaseQueryRunner();
    }
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async commit(): Promise<void> {
    if (!this.queryRunner) {
      throw new Error('Cannot commit: no active transaction. Call begin() first.');
    }
    try {
      await this.queryRunner.commitTransaction();
    } finally {
      await this.releaseQueryRunner();
    }
  }

  async rollback(): Promise<void> {
    if (!this.queryRunner) {
      this.logger.warn('rollback() called with no active transaction — ignoring');
      return;
    }
    try {
      await this.queryRunner.rollbackTransaction();
    } finally {
      await this.releaseQueryRunner();
    }
  }

  getManager(): EntityManager {
    if (!this.queryRunner) {
      throw new Error('Cannot getManager: no active transaction. Call begin() first.');
    }
    return this.queryRunner.manager;
  }

  private async releaseQueryRunner(): Promise<void> {
    if (this.queryRunner) {
      try {
        await this.queryRunner.release();
      } catch {
        this.logger.warn('QueryRunner release failed — already released or connection lost');
      }
      this.queryRunner = null;
    }
  }
}
