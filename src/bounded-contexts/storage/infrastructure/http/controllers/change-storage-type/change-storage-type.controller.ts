import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ChangeStorageTypeCommand } from '@storage/application/commands/change-storage-type/change-storage-type.command';
import { ChangeStorageTypeResult } from '@storage/application/commands/change-storage-type/change-storage-type.handler';
import { ChangeStorageTypeInDto } from '@storage/infrastructure/http/controllers/change-storage-type/change-storage-type-in.dto';

@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class ChangeStorageTypeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid/type')
  @Secure()
  @ApiOperation({ summary: 'Change the type of a storage' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Type changed' })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 409, description: 'Storage is archived or frozen' })
  @ApiResponse({ status: 403, description: 'Tier limit reached for target type' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: ChangeStorageTypeInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<ChangeStorageTypeCommand, ChangeStorageTypeResult>(
      new ChangeStorageTypeCommand(uuid, user.tenantId as string, user.uuid, dto.type),
    );

    return result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );
  }
}
