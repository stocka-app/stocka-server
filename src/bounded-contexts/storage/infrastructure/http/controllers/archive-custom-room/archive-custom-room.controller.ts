import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ArchiveCustomRoomCommand } from '@storage/application/commands/archive-custom-room/archive-custom-room.command';
import { ArchiveCustomRoomResult } from '@storage/application/commands/archive-custom-room/archive-custom-room.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class ArchiveCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid/archive')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Archive a custom room (soft delete — reversible via restore)' })
  @ApiParam({ name: 'uuid', description: 'Custom room UUID' })
  @ApiResponse({ status: 200, description: 'Custom room archived', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 409, description: 'Already archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StorageOutDto> {
    const command = new ArchiveCustomRoomCommand(uuid, user.tenantId as string, user.uuid);
    const result = await this.commandBus.execute<ArchiveCustomRoomCommand, ArchiveCustomRoomResult>(
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
