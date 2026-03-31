import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import {
  ListStoragesQuery,
  StorageFilters,
} from '@storage/application/queries/list-storages/list-storages.query';
import { StoragePage } from '@storage/domain/contracts/storage.repository.contract';
import { ListStoragesInDto } from '@storage/infrastructure/http/controllers/list-storages/list-storages-in.dto';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';
import { StoragePageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-page.out.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class ListStoragesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @Secure()
  @ApiOperation({
    summary: 'List storages for the tenant with optional filters, pagination, search and sort',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of storages', type: StoragePageOutDto })
  async handle(
    @Query() queryDto: ListStoragesInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StoragePageOutDto> {
    const filters: StorageFilters | undefined =
      queryDto.status || queryDto.type
        ? { status: queryDto.status, type: queryDto.type }
        : undefined;

    const pagination = { page: queryDto.page ?? 1, limit: queryDto.limit ?? 50 };

    const query = new ListStoragesQuery(
      user.tenantId as string,
      filters,
      pagination,
      queryDto.search,
      queryDto.sortOrder ?? 'ASC',
    );

    const result = await this.queryBus.execute<ListStoragesQuery, StoragePage>(query);
    const items = result.items.map((s) => StorageOutDto.fromAggregate(s));
    return StoragePageOutDto.from(items, result.total, pagination.page, pagination.limit);
  }
}
