import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UnfreezeStoreRoomCommand } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.command';
import { UnfreezeStoreRoomResult } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class UnfreezeStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/unfreeze')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Unfreeze a store room (resume operations)' })
  @ApiParam({ name: 'uuid', description: 'Store room UUID' })
  @ApiResponse({
    status: 200,
    description: 'Store room unfrozen successfully',
    type: StorageOutDto,
  })
  @ApiResponse({ status: 404, description: 'Store room not found' })
  @ApiResponse({ status: 409, description: 'Not frozen' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const command = new UnfreezeStoreRoomCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<UnfreezeStoreRoomCommand, UnfreezeStoreRoomResult>(
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
