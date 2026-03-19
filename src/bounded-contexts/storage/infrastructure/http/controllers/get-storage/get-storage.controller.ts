import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { GetStorageQuery } from '@storage/application/queries/get-storage/get-storage.query';
import { GetStorageResult } from '@storage/application/queries/get-storage/get-storage.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class GetStorageController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':uuid')
  @RequireAction(SystemAction.STORAGE_READ)
  @ApiOperation({ summary: 'Get a storage by UUID' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Storage details', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StorageOutDto> {
    const query = new GetStorageQuery(uuid, user.tenantId as string);
    const result = await this.queryBus.execute<GetStorageQuery, GetStorageResult>(query);

    return result.match(
      (storage) => StorageOutDto.fromAggregate(storage),
      (error) => {
        throw error;
      },
    );
  }
}
