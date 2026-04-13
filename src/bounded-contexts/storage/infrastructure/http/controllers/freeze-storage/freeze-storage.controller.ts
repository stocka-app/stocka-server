import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { FreezeStorageCommand } from '@storage/application/commands/freeze-storage/freeze-storage.command';
import { FreezeStorageResult } from '@storage/application/commands/freeze-storage/freeze-storage.handler';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class FreezeStorageController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/freeze')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Freeze a storage (pause operations)' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Storage frozen successfully' })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 409, description: 'Already frozen or archived' })
  async handle(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    const command = new FreezeStorageCommand(uuid, user.tenantId as string, user.uuid);

    const result = await this.commandBus.execute<FreezeStorageCommand, FreezeStorageResult>(
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
