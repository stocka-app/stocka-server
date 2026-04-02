import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UpdateStoreRoomCommand } from '@storage/application/commands/update-store-room/update-store-room.command';
import { UpdateStoreRoomResult } from '@storage/application/commands/update-store-room/update-store-room.handler';
import { UpdateStoreRoomInDto } from '@storage/infrastructure/http/controllers/update-store-room/update-store-room-in.dto';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class UpdateStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid')
  @Secure()
  @ApiOperation({ summary: 'Update a store room (bodega)' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Store room updated' })
  @ApiResponse({ status: 404, description: 'Store room not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateStoreRoomInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<UpdateStoreRoomCommand, UpdateStoreRoomResult>(
      new UpdateStoreRoomCommand(
        uuid,
        user.tenantId as string,
        dto.name,
        dto.description,
        dto.icon,
        dto.color,
        dto.address,
      ),
    );

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
