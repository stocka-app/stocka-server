import { Controller, Delete, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { ArchiveStorageCommand } from '@storage/application/commands/archive-storage/archive-storage.command';
import { ArchiveStorageResult } from '@storage/application/commands/archive-storage/archive-storage.handler';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class ArchiveStorageController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAction(SystemAction.STORAGE_DELETE)
  @ApiOperation({ summary: 'Archive a storage (soft delete)' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 204, description: 'Storage archived' })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 409, description: 'Already archived' })
  async handle(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    const command = new ArchiveStorageCommand(uuid, user.tenantId as string);

    const result = await this.commandBus.execute<ArchiveStorageCommand, ArchiveStorageResult>(
      command,
    );

    result.match(
      () => undefined,
      (error) => {
        throw error;
      },
    );
  }
}
