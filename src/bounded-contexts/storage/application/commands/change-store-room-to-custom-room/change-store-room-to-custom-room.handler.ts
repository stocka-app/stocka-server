import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { ChangeStoreRoomToCustomRoomCommand } from '@storage/application/commands/change-store-room-to-custom-room/change-store-room-to-custom-room.command';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNameAlreadyExistsException } from '@storage/domain/exceptions/business/storage-name-already-exists.exception';
import { StorageTypeLockedWhileArchivedException } from '@storage/domain/exceptions/business/storage-type-locked-while-archived.exception';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { StorageTypeLockedWhileFrozenException } from '@storage/domain/exceptions/business/storage-type-locked-while-frozen.exception';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import {
  CUSTOM_ROOM_DEFAULT_COLOR,
  CUSTOM_ROOM_DEFAULT_ICON,
} from '@storage/domain/services/storage-icon-color.resolver';

export type ChangeStoreRoomToCustomRoomResult = Result<{ storageUUID: string }, DomainException>;

const DEFAULT_ROOM_TYPE = 'General';

@CommandHandler(ChangeStoreRoomToCustomRoomCommand)
export class ChangeStoreRoomToCustomRoomHandler implements ICommandHandler<ChangeStoreRoomToCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ChangeStoreRoomToCustomRoomCommand,
  ): Promise<ChangeStoreRoomToCustomRoomResult> {
    const source = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!source || source.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    if (source.isArchived()) {
      return err(new StorageTypeLockedWhileArchivedException(command.storageUUID));
    }

    if (source.isFrozen()) {
      return err(new StorageTypeLockedWhileFrozenException(command.storageUUID));
    }

    const capacityError = await this.policy.assertCustomRoomCapacity(command.tenantUUID);
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
    const effectiveAddress =
      command.metadata.address === undefined
        ? (source.address?.getValue() ?? null)
        : command.metadata.address;
    const effectiveIcon = command.metadata.icon ?? CUSTOM_ROOM_DEFAULT_ICON;
    const effectiveColor = command.metadata.color ?? CUSTOM_ROOM_DEFAULT_COLOR;
    const effectiveRoomType = command.metadata.roomType ?? DEFAULT_ROOM_TYPE;

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundException(command.storageUUID));

    const target = CustomRoomAggregate.forTypeChange({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      name: effectiveName,
      description: effectiveDescription ?? undefined,
      address: effectiveAddress,
      icon: effectiveIcon,
      color: effectiveColor,
      roomType: effectiveRoomType,
    });

    await this.uow.execute(async () => {
      await this.storeRoomRepository.deleteByUUID(command.storageUUID);
      await this.customRoomRepository.save(target, storageId);
    });

    this.eventBus.publish(
      new StorageTypeChangedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.STORE_ROOM,
        StorageType.CUSTOM_ROOM,
      ),
    );

    return ok({ storageUUID: command.storageUUID });
  }
}
