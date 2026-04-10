import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateStoreRoomCommand } from '@storage/application/commands/update-store-room/update-store-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageArchivedCannotBeUpdatedError } from '@storage/domain/errors/storage-archived-cannot-be-updated.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type UpdateStoreRoomResult = Result<{ storageUUID: string }, DomainException>;

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
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const storeRoom = aggregate.findStoreRoom(command.storageUUID);

    if (!storeRoom) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (storeRoom.isArchived()) {
      return err(new StorageArchivedCannotBeUpdatedError(command.storageUUID));
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

    aggregate.updateStoreRoom(
      command.storageUUID,
      {
        name: command.name,
        description: command.description,
        address: command.address,
      },
      command.actorUUID,
    );

    const updated = aggregate.findStoreRoom(command.storageUUID);

    if (!updated || aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    await this.storeRoomRepository.save(updated, aggregate.id);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok({ storageUUID: command.storageUUID });
  }
}
