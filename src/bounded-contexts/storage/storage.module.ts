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
import { ChangeWarehouseToStoreRoomHandler } from '@storage/application/commands/change-warehouse-to-store-room/change-warehouse-to-store-room.handler';
import { ChangeWarehouseToCustomRoomHandler } from '@storage/application/commands/change-warehouse-to-custom-room/change-warehouse-to-custom-room.handler';
import { ChangeStoreRoomToWarehouseHandler } from '@storage/application/commands/change-store-room-to-warehouse/change-store-room-to-warehouse.handler';
import { ChangeStoreRoomToCustomRoomHandler } from '@storage/application/commands/change-store-room-to-custom-room/change-store-room-to-custom-room.handler';
import { ChangeCustomRoomToWarehouseHandler } from '@storage/application/commands/change-custom-room-to-warehouse/change-custom-room-to-warehouse.handler';
import { ChangeCustomRoomToStoreRoomHandler } from '@storage/application/commands/change-custom-room-to-store-room/change-custom-room-to-store-room.handler';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { StorageUpdateEventsPublisher } from '@storage/application/services/storage-update-events.publisher';
import { ArchiveWarehouseHandler } from '@storage/application/commands/archive-warehouse/archive-warehouse.handler';
import { ArchiveStoreRoomHandler } from '@storage/application/commands/archive-store-room/archive-store-room.handler';
import { ArchiveCustomRoomHandler } from '@storage/application/commands/archive-custom-room/archive-custom-room.handler';
import { FreezeWarehouseHandler } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.handler';
import { FreezeStoreRoomHandler } from '@storage/application/commands/freeze-store-room/freeze-store-room.handler';
import { FreezeCustomRoomHandler } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.handler';
import { UnfreezeWarehouseHandler } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.handler';
import { UnfreezeStoreRoomHandler } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.handler';
import { UnfreezeCustomRoomHandler } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.handler';
import { RestoreWarehouseHandler } from '@storage/application/commands/restore-warehouse/restore-warehouse.handler';
import { RestoreStoreRoomHandler } from '@storage/application/commands/restore-store-room/restore-store-room.handler';
import { RestoreCustomRoomHandler } from '@storage/application/commands/restore-custom-room/restore-custom-room.handler';
import { DeletePermanentWarehouseHandler } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.handler';
import { DeletePermanentStoreRoomHandler } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.handler';
import { DeletePermanentCustomRoomHandler } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.handler';
import { ListStoragesHandler } from '@storage/application/queries/list-storages/list-storages.handler';
import { GetStorageHandler } from '@storage/application/queries/get-storage/get-storage.handler';
import { StorageCreatedEventHandler } from '@storage/application/event-handlers/storage-created.event-handler';
import { StorageNameChangedEventHandler } from '@storage/application/event-handlers/storage-name-changed.event-handler';
import { StorageDescriptionChangedEventHandler } from '@storage/application/event-handlers/storage-description-changed.event-handler';
import { StorageAddressChangedEventHandler } from '@storage/application/event-handlers/storage-address-changed.event-handler';
import { StorageIconChangedEventHandler } from '@storage/application/event-handlers/storage-icon-changed.event-handler';
import { StorageColorChangedEventHandler } from '@storage/application/event-handlers/storage-color-changed.event-handler';
import { StorageTypeChangedEventHandler } from '@storage/application/event-handlers/storage-type-changed.event-handler';
import { StorageArchivedEventHandler } from '@storage/application/event-handlers/storage-archived.event-handler';
import { StorageFrozenEventHandler } from '@storage/application/event-handlers/storage-frozen.event-handler';
import { StorageReactivatedEventHandler } from '@storage/application/event-handlers/storage-reactivated.event-handler';
import { StorageRestoredEventHandler } from '@storage/application/event-handlers/storage-restored.event-handler';
import { StoragePermanentlyDeletedEventHandler } from '@storage/application/event-handlers/storage-permanently-deleted.event-handler';
import { CreateCustomRoomController } from '@storage/infrastructure/http/controllers/create-custom-room/create-custom-room.controller';
import { CreateStoreRoomController } from '@storage/infrastructure/http/controllers/create-store-room/create-store-room.controller';
import { CreateWarehouseController } from '@storage/infrastructure/http/controllers/create-warehouse/create-warehouse.controller';
import { UpdateCustomRoomController } from '@storage/infrastructure/http/controllers/update-custom-room/update-custom-room.controller';
import { UpdateStoreRoomController } from '@storage/infrastructure/http/controllers/update-store-room/update-store-room.controller';
import { UpdateWarehouseController } from '@storage/infrastructure/http/controllers/update-warehouse/update-warehouse.controller';
import { ListStoragesController } from '@storage/infrastructure/http/controllers/list-storages/list-storages.controller';
import { GetStorageController } from '@storage/infrastructure/http/controllers/get-storage/get-storage.controller';
import { ChangeWarehouseToStoreRoomController } from '@storage/infrastructure/http/controllers/change-warehouse-to-store-room/change-warehouse-to-store-room.controller';
import { ChangeWarehouseToCustomRoomController } from '@storage/infrastructure/http/controllers/change-warehouse-to-custom-room/change-warehouse-to-custom-room.controller';
import { ChangeStoreRoomToWarehouseController } from '@storage/infrastructure/http/controllers/change-store-room-to-warehouse/change-store-room-to-warehouse.controller';
import { ChangeStoreRoomToCustomRoomController } from '@storage/infrastructure/http/controllers/change-store-room-to-custom-room/change-store-room-to-custom-room.controller';
import { ChangeCustomRoomToWarehouseController } from '@storage/infrastructure/http/controllers/change-custom-room-to-warehouse/change-custom-room-to-warehouse.controller';
import { ChangeCustomRoomToStoreRoomController } from '@storage/infrastructure/http/controllers/change-custom-room-to-store-room/change-custom-room-to-store-room.controller';
import { ArchiveWarehouseController } from '@storage/infrastructure/http/controllers/archive-warehouse/archive-warehouse.controller';
import { ArchiveStoreRoomController } from '@storage/infrastructure/http/controllers/archive-store-room/archive-store-room.controller';
import { ArchiveCustomRoomController } from '@storage/infrastructure/http/controllers/archive-custom-room/archive-custom-room.controller';
import { FreezeWarehouseController } from '@storage/infrastructure/http/controllers/freeze-warehouse/freeze-warehouse.controller';
import { FreezeStoreRoomController } from '@storage/infrastructure/http/controllers/freeze-store-room/freeze-store-room.controller';
import { FreezeCustomRoomController } from '@storage/infrastructure/http/controllers/freeze-custom-room/freeze-custom-room.controller';
import { UnfreezeWarehouseController } from '@storage/infrastructure/http/controllers/unfreeze-warehouse/unfreeze-warehouse.controller';
import { UnfreezeStoreRoomController } from '@storage/infrastructure/http/controllers/unfreeze-store-room/unfreeze-store-room.controller';
import { UnfreezeCustomRoomController } from '@storage/infrastructure/http/controllers/unfreeze-custom-room/unfreeze-custom-room.controller';
import { RestoreWarehouseController } from '@storage/infrastructure/http/controllers/restore-warehouse/restore-warehouse.controller';
import { RestoreStoreRoomController } from '@storage/infrastructure/http/controllers/restore-store-room/restore-store-room.controller';
import { RestoreCustomRoomController } from '@storage/infrastructure/http/controllers/restore-custom-room/restore-custom-room.controller';
import { DeletePermanentWarehouseController } from '@storage/infrastructure/http/controllers/delete-permanent-warehouse/delete-permanent-warehouse.controller';
import { DeletePermanentStoreRoomController } from '@storage/infrastructure/http/controllers/delete-permanent-store-room/delete-permanent-store-room.controller';
import { DeletePermanentCustomRoomController } from '@storage/infrastructure/http/controllers/delete-permanent-custom-room/delete-permanent-custom-room.controller';
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
    ChangeWarehouseToStoreRoomController,
    ChangeWarehouseToCustomRoomController,
    ChangeStoreRoomToWarehouseController,
    ChangeStoreRoomToCustomRoomController,
    ChangeCustomRoomToWarehouseController,
    ChangeCustomRoomToStoreRoomController,
    ArchiveWarehouseController,
    ArchiveStoreRoomController,
    ArchiveCustomRoomController,
    FreezeWarehouseController,
    FreezeStoreRoomController,
    FreezeCustomRoomController,
    UnfreezeWarehouseController,
    UnfreezeStoreRoomController,
    UnfreezeCustomRoomController,
    RestoreWarehouseController,
    RestoreStoreRoomController,
    RestoreCustomRoomController,
    DeletePermanentWarehouseController,
    DeletePermanentStoreRoomController,
    DeletePermanentCustomRoomController,
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
    ChangeWarehouseToStoreRoomHandler,
    ChangeWarehouseToCustomRoomHandler,
    ChangeStoreRoomToWarehouseHandler,
    ChangeStoreRoomToCustomRoomHandler,
    ChangeCustomRoomToWarehouseHandler,
    ChangeCustomRoomToStoreRoomHandler,
    StorageTypeChangePolicy,
    StorageUpdateEventsPublisher,
    ArchiveWarehouseHandler,
    ArchiveStoreRoomHandler,
    ArchiveCustomRoomHandler,
    FreezeWarehouseHandler,
    FreezeStoreRoomHandler,
    FreezeCustomRoomHandler,
    UnfreezeWarehouseHandler,
    UnfreezeStoreRoomHandler,
    UnfreezeCustomRoomHandler,
    RestoreWarehouseHandler,
    RestoreStoreRoomHandler,
    RestoreCustomRoomHandler,
    DeletePermanentWarehouseHandler,
    DeletePermanentStoreRoomHandler,
    DeletePermanentCustomRoomHandler,
    ListStoragesHandler,
    GetStorageHandler,
    StorageCreatedEventHandler,
    StorageNameChangedEventHandler,
    StorageDescriptionChangedEventHandler,
    StorageAddressChangedEventHandler,
    StorageIconChangedEventHandler,
    StorageColorChangedEventHandler,
    StorageTypeChangedEventHandler,
    StorageArchivedEventHandler,
    StorageFrozenEventHandler,
    StorageReactivatedEventHandler,
    StorageRestoredEventHandler,
    StoragePermanentlyDeletedEventHandler,
  ],
  exports: [INJECTION_TOKENS.STORAGE_CONTRACT],
})
export class StorageModule {}
