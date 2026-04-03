import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { GetStorageQuery } from '@storage/application/queries/get-storage/get-storage.query';
import { GetStorageResult } from '@storage/application/queries/get-storage/get-storage.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class GetStorageController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':uuid')
  @Secure()
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
      (view) => StorageOutDto.fromItem(view),
      (error) => {
        throw error;
      },
    );
  }
}
