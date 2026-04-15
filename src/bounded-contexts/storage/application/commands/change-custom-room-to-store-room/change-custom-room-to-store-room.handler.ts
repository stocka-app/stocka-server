import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ChangeCustomRoomToStoreRoomCommand } from '@storage/application/commands/change-custom-room-to-store-room/change-custom-room-to-store-room.command';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageTypeLockedWhileArchivedError } from '@storage/domain/errors/storage-type-locked-while-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import {
  STORE_ROOM_DEFAULT_COLOR,
  STORE_ROOM_DEFAULT_ICON,
} from '@storage/domain/services/storage-icon-color.resolver';

export type ChangeCustomRoomToStoreRoomResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(ChangeCustomRoomToStoreRoomCommand)
export class ChangeCustomRoomToStoreRoomHandler implements ICommandHandler<ChangeCustomRoomToStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ChangeCustomRoomToStoreRoomCommand,
  ): Promise<ChangeCustomRoomToStoreRoomResult> {
    const source = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!source || source.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (source.isArchived()) {
      return err(new StorageTypeLockedWhileArchivedError(command.storageUUID));
    }

    if (source.isFrozen()) {
      return err(new StorageTypeLockedWhileFrozenError(command.storageUUID));
    }

    const capacityError = await this.policy.assertStoreRoomCapacity(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    await this.customRoomRepository.deleteByUUID(command.storageUUID);

    const target = StoreRoomModel.create({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      name: source.name.getValue(),
      description: source.description?.getValue(),
      address: source.address.getValue(),
      icon: STORE_ROOM_DEFAULT_ICON,
      color: STORE_ROOM_DEFAULT_COLOR,
    });

    await this.storeRoomRepository.save(target, storageId);

    this.eventBus.publish(
      new StorageTypeChangedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.CUSTOM_ROOM,
        StorageType.STORE_ROOM,
      ),
    );

    return ok({ storageUUID: command.storageUUID });
  }
}
