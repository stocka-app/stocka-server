import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { StorageFilters } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { ListStoragesInDto } from '@storage/infrastructure/http/controllers/list-storages/list-storages-in.dto';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class ListStoragesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAction(SystemAction.STORAGE_READ)
  @ApiOperation({ summary: 'List storages for the tenant with optional status/type filters' })
  @ApiResponse({ status: 200, description: 'List of storages', type: [StorageOutDto] })
  async handle(
    @Query() queryDto: ListStoragesInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StorageOutDto[]> {
    const filters: StorageFilters | undefined =
      queryDto.status || queryDto.type ? { status: queryDto.status, type: queryDto.type } : undefined;

    const query = new ListStoragesQuery(user.tenantId as string, filters);
    const storages = await this.queryBus.execute<ListStoragesQuery, StorageAggregate[]>(query);
    return storages.map((s) => StorageOutDto.fromAggregate(s));
  }
}
