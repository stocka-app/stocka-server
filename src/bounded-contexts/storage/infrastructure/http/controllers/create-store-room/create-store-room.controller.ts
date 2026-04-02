import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { CreateStoreRoomResult } from '@storage/application/commands/create-store-room/create-store-room.handler';
import { CreateStoreRoomInDto } from '@storage/infrastructure/http/controllers/create-store-room/create-store-room-in.dto';

@ApiTags('Storage')
@Controller('storages/store-rooms')
@ApiBearerAuth('JWT-authentication')
export class CreateStoreRoomController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Secure()
  @ApiOperation({ summary: 'Create a new store room (bodega)' })
  @ApiResponse({ status: 201, description: 'Store room created' })
  @ApiResponse({ status: 403, description: 'Tier limit reached' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Body() dto: CreateStoreRoomInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<CreateStoreRoomCommand, CreateStoreRoomResult>(
      new CreateStoreRoomCommand(
        user.tenantId as string,
        dto.name,
        dto.address,
        dto.description,
        dto.parentUUID,
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
