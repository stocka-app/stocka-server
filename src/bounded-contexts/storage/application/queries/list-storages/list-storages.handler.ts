import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@QueryHandler(ListStoragesQuery)
export class ListStoragesHandler implements IQueryHandler<ListStoragesQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
  ) {}

  async execute(query: ListStoragesQuery): Promise<StorageAggregate[]> {
    return this.storageRepository.findAllActive(query.tenantUUID);
  }
}
