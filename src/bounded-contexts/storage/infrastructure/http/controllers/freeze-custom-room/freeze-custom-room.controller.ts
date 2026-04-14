import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { FreezeCustomRoomCommand } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.command';
import { FreezeCustomRoomResult } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class FreezeCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/freeze')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Freeze a custom room (pause operations)' })
  @ApiParam({ name: 'uuid', description: 'Custom room UUID' })
  @ApiResponse({ status: 200, description: 'Custom room frozen successfully', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 409, description: 'Already frozen or archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StorageOutDto> {
    const command = new FreezeCustomRoomCommand(uuid, user.tenantId as string, user.uuid);
    const result = await this.commandBus.execute<FreezeCustomRoomCommand, FreezeCustomRoomResult>(
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
