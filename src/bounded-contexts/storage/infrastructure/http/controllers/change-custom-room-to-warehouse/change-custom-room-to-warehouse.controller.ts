import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ChangeCustomRoomToWarehouseCommand } from '@storage/application/commands/change-custom-room-to-warehouse/change-custom-room-to-warehouse.command';
import { ChangeCustomRoomToWarehouseResult } from '@storage/application/commands/change-custom-room-to-warehouse/change-custom-room-to-warehouse.handler';
import { ConvertToWarehouseInDto } from '@storage/infrastructure/http/shared/dto/convert-to-warehouse-in.dto';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class ChangeCustomRoomToWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid/convert-to-warehouse')
  @Secure()
  @ApiOperation({ summary: 'Convert a custom room into a warehouse' })
  @ApiParam({ name: 'uuid', description: 'Custom room UUID' })
  @ApiResponse({ status: 200, description: 'Conversion successful' })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 400, description: 'Address required for warehouse target' })
  @ApiResponse({ status: 409, description: 'Source is archived or frozen or name conflicts' })
  @ApiResponse({ status: 403, description: 'Tier limit reached for warehouses' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: ConvertToWarehouseInDto,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<
      ChangeCustomRoomToWarehouseCommand,
      ChangeCustomRoomToWarehouseResult
    >(
      new ChangeCustomRoomToWarehouseCommand(uuid, member.tenantUUID, user.uuid, {
        name: dto.name,
        description: dto.description,
        address: dto.address,
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
