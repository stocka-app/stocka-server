import { Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ChangeCustomRoomToStoreRoomCommand } from '@storage/application/commands/change-custom-room-to-store-room/change-custom-room-to-store-room.command';
import { ChangeCustomRoomToStoreRoomResult } from '@storage/application/commands/change-custom-room-to-store-room/change-custom-room-to-store-room.handler';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class ChangeCustomRoomToStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid/convert-to-store-room')
  @Secure()
  @ApiOperation({ summary: 'Convert a custom room into a store room' })
  @ApiParam({ name: 'uuid', description: 'Custom room UUID' })
  @ApiResponse({ status: 200, description: 'Conversion successful' })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 409, description: 'Source is archived or frozen' })
  @ApiResponse({ status: 403, description: 'Tier limit reached for store rooms' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<
      ChangeCustomRoomToStoreRoomCommand,
      ChangeCustomRoomToStoreRoomResult
    >(new ChangeCustomRoomToStoreRoomCommand(uuid, member.tenantUUID, user.uuid));

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
