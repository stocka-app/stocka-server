import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { StorageItemPage } from '@storage/domain/schemas';
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
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StoragePageOutDto> {
    const filters = { status: queryDto.status, type: queryDto.type };
    const pagination = { page: queryDto.page, limit: queryDto.limit };

    const query = new ListStoragesQuery(
      member.tenantUUID,
      filters,
      pagination,
      queryDto.sortOrder,
      queryDto.search,
    );

    const result = await this.queryBus.execute<ListStoragesQuery, StorageItemPage>(query);

    const items = result.items.map((s) => StorageOutDto.fromItem(s));
    return StoragePageOutDto.from(
      items,
      result.total,
      pagination.page,
      pagination.limit,
      result.summary,
      result.typeSummary,
    );
  }
}
