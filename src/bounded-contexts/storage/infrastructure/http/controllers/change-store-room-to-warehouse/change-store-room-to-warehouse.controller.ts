import { Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ChangeStoreRoomToWarehouseCommand } from '@storage/application/commands/change-store-room-to-warehouse/change-store-room-to-warehouse.command';
import { ChangeStoreRoomToWarehouseResult } from '@storage/application/commands/change-store-room-to-warehouse/change-store-room-to-warehouse.handler';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class ChangeStoreRoomToWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid/convert-to-warehouse')
  @Secure()
  @ApiOperation({ summary: 'Convert a store room into a warehouse' })
  @ApiParam({ name: 'uuid', description: 'Store room UUID' })
  @ApiResponse({ status: 200, description: 'Conversion successful' })
  @ApiResponse({ status: 404, description: 'Store room not found' })
  @ApiResponse({ status: 400, description: 'Address required for warehouse target' })
  @ApiResponse({ status: 409, description: 'Source is archived or frozen' })
  @ApiResponse({ status: 403, description: 'Tier limit reached for warehouses' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<
      ChangeStoreRoomToWarehouseCommand,
      ChangeStoreRoomToWarehouseResult
    >(new ChangeStoreRoomToWarehouseCommand(uuid, user.tenantId as string, user.uuid));

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
