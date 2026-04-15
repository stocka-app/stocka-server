import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UpdateStoreRoomCommand } from '@storage/application/commands/update-store-room/update-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageUpdateEventsPublisher } from '@storage/application/services/storage-update-events.publisher';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type UpdateStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(UpdateStoreRoomCommand)
export class UpdateStoreRoomHandler implements ICommandHandler<UpdateStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly updateEventsPublisher: StorageUpdateEventsPublisher,
  ) {}

  async execute(command: UpdateStoreRoomCommand): Promise<UpdateStoreRoomResult> {
    const before = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!before || before.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    // H-07: metadata is editable in ARCHIVED (per E5.2). Type-change is still
    // blocked by ChangeXToYHandler (StorageTypeLockedWhileArchivedError) and
    // FROZEN by H-05's StorageTypeLockedWhileFrozenError.

    if (command.name !== undefined && command.name !== before.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsError(command.name));
      }
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const after = before.update({
      name: command.name,
      description: command.description,
      address: command.address,
    });
    const saved = await this.storeRoomRepository.save(after, storageId);

    this.updateEventsPublisher.publish({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      actorUUID: command.actorUUID,
      before,
      after: saved,
      fields: {
        name: command.name,
        description: command.description,
        address: command.address,
      },
    });

    return ok(StorageItemViewMapper.fromStoreRoom(saved));
  }
}
