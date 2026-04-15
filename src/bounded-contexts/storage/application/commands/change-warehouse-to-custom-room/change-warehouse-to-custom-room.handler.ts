import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ChangeWarehouseToCustomRoomCommand } from '@storage/application/commands/change-warehouse-to-custom-room/change-warehouse-to-custom-room.command';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageTypeLockedWhileArchivedError } from '@storage/domain/errors/storage-type-locked-while-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import {
  CUSTOM_ROOM_DEFAULT_COLOR,
  CUSTOM_ROOM_DEFAULT_ICON,
} from '@storage/domain/services/storage-icon-color.resolver';

export type ChangeWarehouseToCustomRoomResult = Result<{ storageUUID: string }, DomainException>;

const DEFAULT_ROOM_TYPE = 'General';

@CommandHandler(ChangeWarehouseToCustomRoomCommand)
export class ChangeWarehouseToCustomRoomHandler implements ICommandHandler<ChangeWarehouseToCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ChangeWarehouseToCustomRoomCommand,
  ): Promise<ChangeWarehouseToCustomRoomResult> {
    const source = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!source || source.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (source.isArchived()) {
      return err(new StorageTypeLockedWhileArchivedError(command.storageUUID));
    }
    if (source.isFrozen()) {
      return err(new StorageTypeLockedWhileFrozenError(command.storageUUID));
    }

    const capacityError = await this.policy.assertCustomRoomCapacity(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    await this.warehouseRepository.deleteByUUID(command.storageUUID);

    const target = CustomRoomModel.create({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      name: source.name.getValue(),
      description: source.description?.getValue(),
      address: source.address.getValue(),
      icon: CUSTOM_ROOM_DEFAULT_ICON,
      color: CUSTOM_ROOM_DEFAULT_COLOR,
      roomType: DEFAULT_ROOM_TYPE,
    });
    await this.customRoomRepository.save(target, storageId);

    this.eventBus.publish(
      new StorageTypeChangedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.WAREHOUSE,
        StorageType.CUSTOM_ROOM,
      ),
    );

    return ok({ storageUUID: command.storageUUID });
  }
}
