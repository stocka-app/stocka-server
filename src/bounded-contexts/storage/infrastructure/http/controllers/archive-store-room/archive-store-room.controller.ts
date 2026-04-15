import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ArchiveStoreRoomCommand } from '@storage/application/commands/archive-store-room/archive-store-room.command';
import { ArchiveStoreRoomResult } from '@storage/application/commands/archive-store-room/archive-store-room.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class ArchiveStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid/archive')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Archive a store room (soft delete — reversible via restore)' })
  @ApiParam({ name: 'uuid', description: 'Store room UUID' })
  @ApiResponse({ status: 200, description: 'Store room archived', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Store room not found' })
  @ApiResponse({ status: 409, description: 'Already archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const command = new ArchiveStoreRoomCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<ArchiveStoreRoomCommand, ArchiveStoreRoomResult>(
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
