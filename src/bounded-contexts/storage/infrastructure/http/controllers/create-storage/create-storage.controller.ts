import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { CreateStorageCommand } from '@storage/application/commands/create-storage/create-storage.command';
import { CreateStorageResult } from '@storage/application/commands/create-storage/create-storage.handler';
import { CreateStorageInDto } from '@storage/infrastructure/http/controllers/create-storage/create-storage-in.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class CreateStorageController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @RequireAction(SystemAction.STORAGE_CREATE)
  @ApiOperation({ summary: 'Create a new storage space' })
  @ApiResponse({ status: 201, description: 'Storage created' })
  @ApiResponse({ status: 403, description: 'Tier limit reached or upgrade required' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Body() dto: CreateStorageInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const command = new CreateStorageCommand(
      user.tenantId as string,
      dto.type,
      dto.name,
      dto.address,
      dto.roomType,
    );

    const result = await this.commandBus.execute<CreateStorageCommand, CreateStorageResult>(
      command,
    );

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
