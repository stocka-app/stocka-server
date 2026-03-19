import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { TypeOrmStorageRepository } from '@storage/infrastructure/repositories/typeorm-storage.repository';
import { TenantCapabilitiesAdapter } from '@storage/infrastructure/adapters/tenant-capabilities.adapter';
import { CreateStorageHandler } from '@storage/application/commands/create-storage/create-storage.handler';
import { UpdateStorageHandler } from '@storage/application/commands/update-storage/update-storage.handler';
import { ArchiveStorageHandler } from '@storage/application/commands/archive-storage/archive-storage.handler';
import { ListStoragesHandler } from '@storage/application/queries/list-storages/list-storages.handler';
import { GetStorageHandler } from '@storage/application/queries/get-storage/get-storage.handler';
import { CreateStorageController } from '@storage/infrastructure/http/controllers/create-storage/create-storage.controller';
import { ListStoragesController } from '@storage/infrastructure/http/controllers/list-storages/list-storages.controller';
import { GetStorageController } from '@storage/infrastructure/http/controllers/get-storage/get-storage.controller';
import { UpdateStorageController } from '@storage/infrastructure/http/controllers/update-storage/update-storage.controller';
import { ArchiveStorageController } from '@storage/infrastructure/http/controllers/archive-storage/archive-storage.controller';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([StorageEntity, CustomRoomEntity, StoreRoomEntity, WarehouseEntity]),
    CqrsModule,
  ],
  controllers: [
    CreateStorageController,
    ListStoragesController,
    GetStorageController,
    UpdateStorageController,
    ArchiveStorageController,
  ],
  providers: [
    { provide: INJECTION_TOKENS.STORAGE_CONTRACT, useClass: TypeOrmStorageRepository },
    { provide: INJECTION_TOKENS.TENANT_CAPABILITIES_PORT, useClass: TenantCapabilitiesAdapter },
    TypeOrmStorageRepository,
    TenantCapabilitiesAdapter,
    CreateStorageHandler,
    UpdateStorageHandler,
    ArchiveStorageHandler,
    ListStoragesHandler,
    GetStorageHandler,
  ],
  exports: [INJECTION_TOKENS.STORAGE_CONTRACT],
})
export class StorageModule {}
