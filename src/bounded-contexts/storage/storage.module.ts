import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';
import { TypeOrmStorageRepository } from '@storage/infrastructure/repositories/typeorm-storage.repository';
import { TypeOrmWarehouseRepository } from '@storage/infrastructure/repositories/typeorm-warehouse.repository';
import { TypeOrmStoreRoomRepository } from '@storage/infrastructure/repositories/typeorm-store-room.repository';
import { TypeOrmCustomRoomRepository } from '@storage/infrastructure/repositories/typeorm-custom-room.repository';
import { TypeOrmStorageActivityLogRepository } from '@storage/infrastructure/repositories/typeorm-storage-activity-log.repository';
import { TenantCapabilitiesAdapter } from '@storage/infrastructure/adapters/tenant-capabilities.adapter';
import { CreateCustomRoomHandler } from '@storage/application/commands/create-custom-room/create-custom-room.handler';
import { CreateStoreRoomHandler } from '@storage/application/commands/create-store-room/create-store-room.handler';
import { CreateWarehouseHandler } from '@storage/application/commands/create-warehouse/create-warehouse.handler';
import { UpdateCustomRoomHandler } from '@storage/application/commands/update-custom-room/update-custom-room.handler';
import { UpdateStoreRoomHandler } from '@storage/application/commands/update-store-room/update-store-room.handler';
import { UpdateWarehouseHandler } from '@storage/application/commands/update-warehouse/update-warehouse.handler';
import { ArchiveStorageHandler } from '@storage/application/commands/archive-storage/archive-storage.handler';
import { ListStoragesHandler } from '@storage/application/queries/list-storages/list-storages.handler';
import { GetStorageHandler } from '@storage/application/queries/get-storage/get-storage.handler';
import { CreateCustomRoomController } from '@storage/infrastructure/http/controllers/create-custom-room/create-custom-room.controller';
import { CreateStoreRoomController } from '@storage/infrastructure/http/controllers/create-store-room/create-store-room.controller';
import { CreateWarehouseController } from '@storage/infrastructure/http/controllers/create-warehouse/create-warehouse.controller';
import { UpdateCustomRoomController } from '@storage/infrastructure/http/controllers/update-custom-room/update-custom-room.controller';
import { UpdateStoreRoomController } from '@storage/infrastructure/http/controllers/update-store-room/update-store-room.controller';
import { UpdateWarehouseController } from '@storage/infrastructure/http/controllers/update-warehouse/update-warehouse.controller';
import { ListStoragesController } from '@storage/infrastructure/http/controllers/list-storages/list-storages.controller';
import { GetStorageController } from '@storage/infrastructure/http/controllers/get-storage/get-storage.controller';
import { ArchiveStorageController } from '@storage/infrastructure/http/controllers/archive-storage/archive-storage.controller';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StorageEntity,
      CustomRoomEntity,
      StoreRoomEntity,
      WarehouseEntity,
      StorageActivityLogEntity,
    ]),
    CqrsModule,
    MediatorModule,
  ],
  controllers: [
    CreateCustomRoomController,
    CreateStoreRoomController,
    CreateWarehouseController,
    UpdateCustomRoomController,
    UpdateStoreRoomController,
    UpdateWarehouseController,
    ListStoragesController,
    GetStorageController,
    ArchiveStorageController,
  ],
  providers: [
    { provide: INJECTION_TOKENS.STORAGE_CONTRACT, useClass: TypeOrmStorageRepository },
    { provide: INJECTION_TOKENS.WAREHOUSE_CONTRACT, useClass: TypeOrmWarehouseRepository },
    { provide: INJECTION_TOKENS.STORE_ROOM_CONTRACT, useClass: TypeOrmStoreRoomRepository },
    { provide: INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT, useClass: TypeOrmCustomRoomRepository },
    {
      provide: INJECTION_TOKENS.STORAGE_ACTIVITY_LOG_CONTRACT,
      useClass: TypeOrmStorageActivityLogRepository,
    },
    { provide: INJECTION_TOKENS.TENANT_CAPABILITIES_PORT, useClass: TenantCapabilitiesAdapter },
    TypeOrmStorageRepository,
    TypeOrmWarehouseRepository,
    TypeOrmStoreRoomRepository,
    TypeOrmCustomRoomRepository,
    TypeOrmStorageActivityLogRepository,
    TenantCapabilitiesAdapter,
    CreateCustomRoomHandler,
    CreateStoreRoomHandler,
    CreateWarehouseHandler,
    UpdateCustomRoomHandler,
    UpdateStoreRoomHandler,
    UpdateWarehouseHandler,
    ArchiveStorageHandler,
    ListStoragesHandler,
    GetStorageHandler,
  ],
  exports: [INJECTION_TOKENS.STORAGE_CONTRACT],
})
export class StorageModule {}
