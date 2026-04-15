import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { FreezeStoreRoomCommand } from '@storage/application/commands/freeze-store-room/freeze-store-room.command';
import { FreezeStoreRoomResult } from '@storage/application/commands/freeze-store-room/freeze-store-room.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class FreezeStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/freeze')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Freeze a store room (pause operations)' })
  @ApiParam({ name: 'uuid', description: 'Store room UUID' })
  @ApiResponse({ status: 200, description: 'Store room frozen successfully', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Store room not found' })
  @ApiResponse({ status: 409, description: 'Already frozen or archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const command = new FreezeStoreRoomCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<FreezeStoreRoomCommand, FreezeStoreRoomResult>(
      command,
    );
    return result.match(
      (view) => StorageOutDto.fromItem(view),
      (error) => {
        throw error;
      },
    );
  }
}
