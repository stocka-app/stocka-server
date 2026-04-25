import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UpdateStoreRoomCommand } from '@storage/application/commands/update-store-room/update-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
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
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateStoreRoomCommand): Promise<UpdateStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (command.name !== undefined && command.name !== storeRoom.name.getValue()) {
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

    const transition = storeRoom.update(
      {
        name: command.name,
        description: command.description,
        address: command.address,
      },
      command.actorUUID,
    );
    if (transition.isErr()) return err(transition.error);

    const saved = await this.storeRoomRepository.save(storeRoom, storageId);

    this.eventPublisher.mergeObjectContext(storeRoom);
    storeRoom.commit();

    return ok(StorageItemViewMapper.fromStoreRoom(saved));
  }
}
