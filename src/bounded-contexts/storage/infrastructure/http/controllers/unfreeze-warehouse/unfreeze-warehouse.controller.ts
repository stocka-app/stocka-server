import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UnfreezeWarehouseCommand } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.command';
import { UnfreezeWarehouseResult } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.handler';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class UnfreezeWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':uuid/unfreeze')
  @HttpCode(HttpStatus.OK)
  @Secure()
  @ApiOperation({ summary: 'Unfreeze a warehouse (resume operations)' })
  @ApiParam({ name: 'uuid', description: 'Warehouse UUID' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse unfrozen successfully',
    type: StorageOutDto,
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Not frozen' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StorageOutDto> {
    const command = new UnfreezeWarehouseCommand(uuid, user.tenantId as string, user.uuid);
    const result = await this.commandBus.execute<UnfreezeWarehouseCommand, UnfreezeWarehouseResult>(
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
