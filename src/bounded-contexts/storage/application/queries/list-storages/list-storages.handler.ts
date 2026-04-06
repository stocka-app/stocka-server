import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageItemPage, StorageItemView, StorageStatusSummary } from '@storage/domain/schemas';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@QueryHandler(ListStoragesQuery)
export class ListStoragesHandler implements IQueryHandler<ListStoragesQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
  ) {}

  async execute(query: ListStoragesQuery): Promise<StorageItemPage> {
    const aggregate = await this.storageRepository.findOrCreate(query.tenantUUID);
    let items: StorageItemView[] = aggregate.listItemViews();

    // Apply type filter first — summary is scoped to this type view
    if (query.filters?.type) {
      items = items.filter((i) => i.type === query.filters.type);
    }

    // Compute summary before status/search filters so it always reflects
    // the full count within the current type scope (not just the filtered page).
    const summary: StorageStatusSummary = {
      active: items.filter((i) => i.archivedAt === null && i.frozenAt === null).length,
      frozen: items.filter((i) => i.frozenAt !== null && i.archivedAt === null).length,
      archived: items.filter((i) => i.archivedAt !== null).length,
    };

    if (query.filters?.status === StorageStatus.ACTIVE) {
      items = items.filter((i) => i.archivedAt === null && i.frozenAt === null);
    } else if (query.filters?.status === StorageStatus.ARCHIVED) {
      items = items.filter((i) => i.archivedAt !== null);
    } else if (query.filters?.status === StorageStatus.FROZEN) {
      items = items.filter((i) => i.frozenAt !== null && i.archivedAt === null);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(searchLower));
    }

    const order = query.sortOrder;
    items = [...items].sort((a, b) =>
      order === 'ASC' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );

    const total = items.length;
    const { page, limit } = query.pagination;
    const skip = (page - 1) * limit;

    return { items: items.slice(skip, skip + limit), total, summary };
  }
}
