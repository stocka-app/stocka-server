import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UnfreezeCustomRoomCommand } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.command';
import { UnfreezeCustomRoomResult } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.handler';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class UnfreezeCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/unfreeze')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Unfreeze a custom room (resume operations)' })
  @ApiParam({ name: 'uuid', description: 'Custom room UUID' })
  @ApiResponse({ status: 200, description: 'Custom room unfrozen successfully' })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 409, description: 'Not frozen' })
  async handle(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    const command = new UnfreezeCustomRoomCommand(uuid, user.tenantId as string, user.uuid);
    const result = await this.commandBus.execute<
      UnfreezeCustomRoomCommand,
      UnfreezeCustomRoomResult
    >(command);
    result.match(
      () => undefined,
      (error) => {
        throw error;
      },
    );
  }
}
