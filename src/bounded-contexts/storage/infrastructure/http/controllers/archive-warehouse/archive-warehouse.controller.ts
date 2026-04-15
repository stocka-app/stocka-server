import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { ArchiveWarehouseCommand } from '@storage/application/commands/archive-warehouse/archive-warehouse.command';
import { ArchiveWarehouseResult } from '@storage/application/commands/archive-warehouse/archive-warehouse.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class ArchiveWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid/archive')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Archive a warehouse (soft delete — reversible via restore)' })
  @ApiParam({ name: 'uuid', description: 'Warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Warehouse archived', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Already archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const command = new ArchiveWarehouseCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<ArchiveWarehouseCommand, ArchiveWarehouseResult>(
      command,
    );
    return result.match(
      (view) => StorageOutDto.fromItem(view),
      (error) => {
        throw error;
      },
    );
  }
}
