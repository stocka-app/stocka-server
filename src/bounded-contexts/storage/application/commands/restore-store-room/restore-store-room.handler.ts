import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { RestoreStoreRoomCommand } from '@storage/application/commands/restore-store-room/restore-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type RestoreStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(RestoreStoreRoomCommand)
export class RestoreStoreRoomHandler implements ICommandHandler<RestoreStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RestoreStoreRoomCommand): Promise<RestoreStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    const capacityError = await this.policy.assertStoreRoomCanRestore(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const transition = storeRoom.markRestored(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const saved = await this.storeRoomRepository.save(storeRoom, storageId);

    this.eventPublisher.mergeObjectContext(storeRoom);
    storeRoom.commit();

    return ok(StorageItemViewMapper.fromStoreRoom(saved));
  }
}
