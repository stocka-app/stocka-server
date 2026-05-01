import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetStorageQuery } from '@storage/application/queries/get-storage/get-storage.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageItemView } from '@storage/domain/schemas';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type GetStorageResult = Result<StorageItemView, DomainException>;

@QueryHandler(GetStorageQuery)
export class GetStorageHandler implements IQueryHandler<GetStorageQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
  ) {}

  async execute(query: GetStorageQuery): Promise<GetStorageResult> {
    const aggregate = await this.storageRepository.findOrCreate(query.tenantUUID);
    const view = aggregate.findItemView(query.storageUUID);

    if (!view) {
      return err(new StorageNotFoundException(query.storageUUID));
    }

    return ok(view);
  }
}
