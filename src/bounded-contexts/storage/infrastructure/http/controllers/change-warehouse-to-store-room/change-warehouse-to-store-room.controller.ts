import { Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ChangeWarehouseToStoreRoomCommand } from '@storage/application/commands/change-warehouse-to-store-room/change-warehouse-to-store-room.command';
import { ChangeWarehouseToStoreRoomResult } from '@storage/application/commands/change-warehouse-to-store-room/change-warehouse-to-store-room.handler';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class ChangeWarehouseToStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid/convert-to-store-room')
  @Secure()
  @ApiOperation({ summary: 'Convert a warehouse into a store room' })
  @ApiParam({ name: 'uuid', description: 'Warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Conversion successful' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Source is archived or frozen' })
  @ApiResponse({ status: 403, description: 'Tier limit reached for store rooms' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<
      ChangeWarehouseToStoreRoomCommand,
      ChangeWarehouseToStoreRoomResult
    >(new ChangeWarehouseToStoreRoomCommand(uuid, user.tenantId as string, user.uuid));

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
