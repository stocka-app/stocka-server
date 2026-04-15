import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { RestoreCustomRoomCommand } from '@storage/application/commands/restore-custom-room/restore-custom-room.command';
import { RestoreCustomRoomResult } from '@storage/application/commands/restore-custom-room/restore-custom-room.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class RestoreCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/restore')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Restore an archived custom room (back to ACTIVE)' })
  @ApiParam({ name: 'uuid', description: 'Custom room UUID' })
  @ApiResponse({
    status: 200,
    description: 'Custom room restored successfully',
    type: StorageOutDto,
  })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 409, description: 'Not archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const command = new RestoreCustomRoomCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<RestoreCustomRoomCommand, RestoreCustomRoomResult>(
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
