import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { DeletePermanentCustomRoomCommand } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.command';
import { DeletePermanentCustomRoomResult } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.handler';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class DeletePermanentCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Secure()
  @ApiOperation({ summary: 'Permanently delete an archived custom-room (irreversible)' })
  @ApiParam({ name: 'uuid', description: 'Custom-room UUID' })
  @ApiResponse({ status: 204, description: 'Custom-room permanently deleted' })
  @ApiResponse({
    status: 404,
    description: 'Custom-room not found or does not belong to this tenant',
  })
  @ApiResponse({ status: 409, description: 'Custom-room is not in ARCHIVED state' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<void> {
    const command = new DeletePermanentCustomRoomCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<
      DeletePermanentCustomRoomCommand,
      DeletePermanentCustomRoomResult
    >(command);
    result.match(
      () => undefined,
      (error) => {
        throw error;
      },
    );
  }
}
