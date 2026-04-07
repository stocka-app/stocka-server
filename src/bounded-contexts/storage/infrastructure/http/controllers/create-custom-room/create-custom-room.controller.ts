import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { CreateCustomRoomCommand } from '@storage/application/commands/create-custom-room/create-custom-room.command';
import { CreateCustomRoomResult } from '@storage/application/commands/create-custom-room/create-custom-room.handler';
import { CreateCustomRoomInDto } from '@storage/infrastructure/http/controllers/create-custom-room/create-custom-room-in.dto';

@ApiTags('Storage')
@Controller('storages/custom-rooms')
@ApiBearerAuth('JWT-authentication')
export class CreateCustomRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Secure()
  @ApiOperation({ summary: 'Create a new custom room' })
  @ApiResponse({ status: 201, description: 'Custom room created' })
  @ApiResponse({ status: 403, description: 'Tier limit reached' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Body() dto: CreateCustomRoomInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<CreateCustomRoomCommand, CreateCustomRoomResult>(
      new CreateCustomRoomCommand(
        user.tenantId as string,
        dto.name,
        dto.roomType,
        dto.address,
        user.uuid,
        dto.description,
        dto.icon,
        dto.color,
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
