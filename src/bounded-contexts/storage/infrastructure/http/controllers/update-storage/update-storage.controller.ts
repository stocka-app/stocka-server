import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { UpdateStorageCommand } from '@storage/application/commands/update-storage/update-storage.command';
import { UpdateStorageResult } from '@storage/application/commands/update-storage/update-storage.handler';
import { UpdateStorageInDto } from '@storage/infrastructure/http/controllers/update-storage/update-storage-in.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class UpdateStorageController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid')
  @RequireAction(SystemAction.STORAGE_UPDATE)
  @ApiOperation({ summary: 'Update a storage' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Storage updated' })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateStorageInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const command = new UpdateStorageCommand(uuid, user.tenantId as string, dto.name);

    const result = await this.commandBus.execute<UpdateStorageCommand, UpdateStorageResult>(
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
