import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ArchiveStorageCommand } from '@storage/application/commands/archive-storage/archive-storage.command';
import { ArchiveStorageResult } from '@storage/application/commands/archive-storage/archive-storage.handler';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class ArchiveStorageController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Secure()
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
