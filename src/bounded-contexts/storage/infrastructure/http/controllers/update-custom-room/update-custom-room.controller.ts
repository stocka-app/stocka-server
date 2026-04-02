import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { UpdateCustomRoomResult } from '@storage/application/commands/update-custom-room/update-custom-room.handler';
import { UpdateCustomRoomInDto } from '@storage/infrastructure/http/controllers/update-custom-room/update-custom-room-in.dto';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class UpdateCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid')
  @Secure()
  @ApiOperation({ summary: 'Update a custom room' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Custom room updated' })
  @ApiResponse({ status: 404, description: 'Custom room not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateCustomRoomInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<UpdateCustomRoomCommand, UpdateCustomRoomResult>(
      new UpdateCustomRoomCommand(
        uuid,
        user.tenantId as string,
        dto.name,
        dto.description,
        dto.icon,
        dto.color,
        dto.address,
        dto.roomType,
      ),
    );

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
