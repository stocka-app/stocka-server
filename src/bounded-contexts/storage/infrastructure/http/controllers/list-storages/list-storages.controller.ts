import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class ListStoragesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAction(SystemAction.STORAGE_READ)
  @ApiOperation({ summary: 'List all active storages for the tenant' })
  @ApiResponse({ status: 200, description: 'List of storages', type: [StorageOutDto] })
  async handle(@CurrentUser() user: JwtPayload): Promise<StorageOutDto[]> {
    const query = new ListStoragesQuery(user.tenantId as string);
    const storages = await this.queryBus.execute<ListStoragesQuery, StorageAggregate[]>(query);
    return storages.map((s) => StorageOutDto.fromAggregate(s));
  }
}
