import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { UpdateWarehouseCommand } from '@storage/application/commands/update-warehouse/update-warehouse.command';
import { UpdateWarehouseResult } from '@storage/application/commands/update-warehouse/update-warehouse.handler';
import { UpdateWarehouseInDto } from '@storage/infrastructure/http/controllers/update-warehouse/update-warehouse-in.dto';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class UpdateWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':uuid')
  @Secure()
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 200, description: 'Warehouse updated', type: StorageOutDto })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateWarehouseInDto,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<StorageOutDto> {
    const result = await this.commandBus.execute<UpdateWarehouseCommand, UpdateWarehouseResult>(
      new UpdateWarehouseCommand(
        uuid,
        member.tenantUUID,
        user.uuid,
        dto.name,
        dto.description,
        dto.address,
      ),
    );

    return result.match(
      (view) => StorageOutDto.fromItem(view),
      (error) => {
        throw error;
      },
    );
  }
}
