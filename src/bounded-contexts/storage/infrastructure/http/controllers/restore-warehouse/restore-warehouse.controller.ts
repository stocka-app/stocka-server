import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { RestoreWarehouseCommand } from '@storage/application/commands/restore-warehouse/restore-warehouse.command';
import { RestoreWarehouseResult } from '@storage/application/commands/restore-warehouse/restore-warehouse.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class RestoreWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/restore')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Restore an archived warehouse (back to ACTIVE)' })
  @ApiParam({ name: 'uuid', description: 'Warehouse UUID' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse restored successfully',
    type: StorageOutDto,
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Not archived' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const command = new RestoreWarehouseCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<RestoreWarehouseCommand, RestoreWarehouseResult>(
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
