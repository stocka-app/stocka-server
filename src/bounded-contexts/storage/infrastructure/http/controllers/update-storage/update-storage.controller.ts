import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UpdateStorageCommand } from '@storage/application/commands/update-storage/update-storage.command';
import { UpdateStorageResult } from '@storage/application/commands/update-storage/update-storage.handler';
import { UpdateStorageInDto } from '@storage/infrastructure/http/controllers/update-storage/update-storage-in.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class UpdateStorageController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid')
  @Secure()
  @ApiOperation({ summary: 'Update a storage (unified — any type)' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Storage updated' })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 409, description: 'Name already exists or storage is archived' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateStorageInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<UpdateStorageCommand, UpdateStorageResult>(
      new UpdateStorageCommand(
        uuid,
        user.tenantId as string,
        user.uuid,
        dto.name,
        dto.type,
        dto.description,
        dto.address,
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
