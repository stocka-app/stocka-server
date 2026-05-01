import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { ChangeCustomRoomToWarehouseCommand } from '@storage/application/commands/change-custom-room-to-warehouse/change-custom-room-to-warehouse.command';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNameAlreadyExistsException } from '@storage/domain/exceptions/business/storage-name-already-exists.exception';
import { StorageTypeLockedWhileArchivedException } from '@storage/domain/exceptions/business/storage-type-locked-while-archived.exception';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { StorageTypeLockedWhileFrozenException } from '@storage/domain/exceptions/business/storage-type-locked-while-frozen.exception';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import {
  WAREHOUSE_DEFAULT_COLOR,
  WAREHOUSE_DEFAULT_ICON,
} from '@storage/domain/services/storage-icon-color.resolver';

export type ChangeCustomRoomToWarehouseResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(ChangeCustomRoomToWarehouseCommand)
export class ChangeCustomRoomToWarehouseHandler implements ICommandHandler<ChangeCustomRoomToWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ChangeCustomRoomToWarehouseCommand,
  ): Promise<ChangeCustomRoomToWarehouseResult> {
    const source = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!source || source.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }
    if (source.isArchived()) {
      return err(new StorageTypeLockedWhileArchivedException(command.storageUUID));
    }
    if (source.isFrozen()) {
      return err(new StorageTypeLockedWhileFrozenException(command.storageUUID));
    }

    const effectiveAddress =
      command.metadata.address === undefined
        ? (source.address?.getValue() ?? '')
        : (command.metadata.address ?? '');
    const addressError = this.policy.assertAddressForWarehouse(
      effectiveAddress,
      command.storageUUID,
    );
    if (addressError) return err(addressError);

    const capacityError = await this.policy.assertWarehouseCapacity(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const effectiveName = command.metadata.name ?? source.name.getValue();
    if (command.metadata.name !== undefined && effectiveName !== source.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        effectiveName,
      );
      if (nameExists) return err(new StorageNameAlreadyExistsException(effectiveName));
    }

    const effectiveDescription =
      command.metadata.description !== undefined
        ? command.metadata.description
        : (source.description?.getValue() ?? null);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundException(command.storageUUID));

    const target = WarehouseAggregate.forTypeChange({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      name: effectiveName,
      description: effectiveDescription ?? undefined,
      address: effectiveAddress,
      icon: WAREHOUSE_DEFAULT_ICON,
      color: WAREHOUSE_DEFAULT_COLOR,
    });

    await this.uow.execute(async () => {
      await this.customRoomRepository.deleteByUUID(command.storageUUID);
      await this.warehouseRepository.save(target, storageId);
    });

    this.eventBus.publish(
      new StorageTypeChangedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.CUSTOM_ROOM,
        StorageType.WAREHOUSE,
      ),
    );

    return ok({ storageUUID: command.storageUUID });
  }
}
