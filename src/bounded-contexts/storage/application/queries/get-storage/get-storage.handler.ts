import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetStorageQuery } from '@storage/application/queries/get-storage/get-storage.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type GetStorageResult = Result<StorageAggregate, DomainException>;

@QueryHandler(GetStorageQuery)
export class GetStorageHandler implements IQueryHandler<GetStorageQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
  ) {}

  async execute(query: GetStorageQuery): Promise<GetStorageResult> {
    const storage = await this.storageRepository.findByUUID(query.storageUUID, query.tenantUUID);

    if (!storage) {
      return err(new StorageNotFoundError(query.storageUUID));
    }

    return ok(storage);
  }
}
