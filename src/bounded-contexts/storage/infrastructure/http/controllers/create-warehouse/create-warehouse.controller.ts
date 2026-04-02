import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { CreateWarehouseCommand } from '@storage/application/commands/create-warehouse/create-warehouse.command';
import { CreateWarehouseResult } from '@storage/application/commands/create-warehouse/create-warehouse.handler';
import { CreateWarehouseInDto } from '@storage/infrastructure/http/controllers/create-warehouse/create-warehouse-in.dto';

@ApiTags('Storage')
@Controller('storages/warehouses')
@ApiBearerAuth('JWT-authentication')
export class CreateWarehouseController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Secure()
  @ApiOperation({ summary: 'Create a new warehouse (almacén)' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @ApiResponse({ status: 403, description: 'Tier upgrade required' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async handle(
    @Body() dto: CreateWarehouseInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ storageUUID: string }> {
    const result = await this.commandBus.execute<CreateWarehouseCommand, CreateWarehouseResult>(
      new CreateWarehouseCommand(
        user.tenantId as string,
        dto.name,
        dto.icon,
        dto.color,
        dto.address,
        dto.description,
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
