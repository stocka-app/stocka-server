import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentMember, CurrentMemberData } from '@common/decorators/current-member.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { DeletePermanentWarehouseCommand } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.command';
import { DeletePermanentWarehouseResult } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.handler';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class DeletePermanentWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':uuid/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Secure()
  @ApiOperation({ summary: 'Permanently delete an archived warehouse (irreversible)' })
  @ApiParam({ name: 'uuid', description: 'Warehouse UUID' })
  @ApiResponse({ status: 204, description: 'Warehouse permanently deleted' })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found or does not belong to this tenant',
  })
  @ApiResponse({ status: 409, description: 'Warehouse is not in ARCHIVED state' })
  async handle(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: CurrentMemberData,
  ): Promise<void> {
    const command = new DeletePermanentWarehouseCommand(uuid, member.tenantUUID, user.uuid);
    const result = await this.commandBus.execute<
      DeletePermanentWarehouseCommand,
      DeletePermanentWarehouseResult
    >(command);
    result.match(
      () => undefined,
      (error) => {
        throw error;
      },
    );
  }
}
