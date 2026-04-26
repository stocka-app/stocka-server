import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { DeletePermanentStoreRoomCommand } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.command';
import { DeletePermanentStoreRoomResult } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.handler';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class DeletePermanentStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Secure()
  @ApiOperation({ summary: 'Permanently delete an archived store-room (irreversible)' })
  @ApiParam({ name: 'uuid', description: 'Store-room UUID' })
  @ApiResponse({ status: 204, description: 'Store-room permanently deleted' })
  @ApiResponse({
    status: 404,
    description: 'Store-room not found or does not belong to this tenant',
  })
  @ApiResponse({ status: 409, description: 'Store-room is not in ARCHIVED state' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<void> {
    const command = new DeletePermanentStoreRoomCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<
      DeletePermanentStoreRoomCommand,
      DeletePermanentStoreRoomResult
    >(command);
    result.match(
      () => undefined,
      (error) => {
        throw error;
      },
    );
  }
}
