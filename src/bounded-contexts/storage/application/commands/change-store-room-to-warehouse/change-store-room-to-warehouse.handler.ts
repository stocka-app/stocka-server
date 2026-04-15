import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ChangeStoreRoomToWarehouseCommand } from '@storage/application/commands/change-store-room-to-warehouse/change-store-room-to-warehouse.command';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageTypeLockedWhileArchivedError } from '@storage/domain/errors/storage-type-locked-while-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import {
  WAREHOUSE_DEFAULT_COLOR,
  WAREHOUSE_DEFAULT_ICON,
} from '@storage/domain/services/storage-icon-color.resolver';

export type ChangeStoreRoomToWarehouseResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(ChangeStoreRoomToWarehouseCommand)
export class ChangeStoreRoomToWarehouseHandler implements ICommandHandler<ChangeStoreRoomToWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ChangeStoreRoomToWarehouseCommand,
  ): Promise<ChangeStoreRoomToWarehouseResult> {
    const source = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!source || source.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (source.isArchived()) {
      return err(new StorageTypeLockedWhileArchivedError(command.storageUUID));
    }
    if (source.isFrozen()) {
      return err(new StorageTypeLockedWhileFrozenError(command.storageUUID));
    }

    const addressError = this.policy.assertAddressForWarehouse(
      source.address.getValue(),
      command.storageUUID,
    );
    if (addressError) return err(addressError);

    const capacityError = await this.policy.assertWarehouseCapacity(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    await this.storeRoomRepository.deleteByUUID(command.storageUUID);

    const target = WarehouseModel.create({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      name: source.name.getValue(),
      description: source.description?.getValue(),
      address: source.address.getValue(),
      icon: WAREHOUSE_DEFAULT_ICON,
      color: WAREHOUSE_DEFAULT_COLOR,
    });
    await this.warehouseRepository.save(target, storageId);

    this.eventBus.publish(
      new StorageTypeChangedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.STORE_ROOM,
        StorageType.WAREHOUSE,
      ),
    );

    return ok({ storageUUID: command.storageUUID });
  }
}
