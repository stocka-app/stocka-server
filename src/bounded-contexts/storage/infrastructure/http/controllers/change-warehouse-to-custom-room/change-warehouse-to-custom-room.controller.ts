import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ChangeWarehouseToCustomRoomCommand } from '@storage/application/commands/change-warehouse-to-custom-room/change-warehouse-to-custom-room.command';
import { ChangeWarehouseToCustomRoomResult } from '@storage/application/commands/change-warehouse-to-custom-room/change-warehouse-to-custom-room.handler';
import { ConvertToCustomRoomInDto } from '@storage/infrastructure/http/shared/dto/convert-to-custom-room-in.dto';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class ChangeWarehouseToCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid/convert-to-custom-room')
  @Secure()
  @ApiOperation({ summary: 'Convert a warehouse into a custom room' })
  @ApiParam({ name: 'uuid', description: 'Warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Conversion successful' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Source is archived or frozen or name conflicts' })
  @ApiResponse({ status: 403, description: 'Tier limit reached for custom rooms' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: ConvertToCustomRoomInDto,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<
      ChangeWarehouseToCustomRoomCommand,
      ChangeWarehouseToCustomRoomResult
    >(
      new ChangeWarehouseToCustomRoomCommand(uuid, member.tenantUUID, user.uuid, {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        roomType: dto.roomType,
        icon: dto.icon,
        color: dto.color,
      }),
    );

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
