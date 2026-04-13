import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FreezeStorageCommand } from '@storage/application/commands/freeze-storage/freeze-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type FreezeStorageResult = Result<void, DomainException>;

@CommandHandler(FreezeStorageCommand)
export class FreezeStorageHandler implements ICommandHandler<FreezeStorageCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: FreezeStorageCommand): Promise<FreezeStorageResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const view = aggregate.findItemView(command.storageUUID);

    if (!view) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (view.frozenAt !== null) {
      return err(new StorageAlreadyFrozenError(command.storageUUID));
    }

    if (view.archivedAt !== null) {
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));
    }

    // H-05: NO check for "last active installation" — validation is client-side (ADR D-10)

    const storageId = aggregate.id as number;

    if (view.type === StorageType.WAREHOUSE) {
      aggregate.freezeWarehouse(command.storageUUID, command.actorUUID);
      const updated = aggregate.findWarehouse(command.storageUUID);
      if (updated) await this.warehouseRepository.save(updated, storageId);
    } else if (view.type === StorageType.STORE_ROOM) {
      aggregate.freezeStoreRoom(command.storageUUID, command.actorUUID);
      const updated = aggregate.findStoreRoom(command.storageUUID);
      if (updated) await this.storeRoomRepository.save(updated, storageId);
    } else {
      aggregate.freezeCustomRoom(command.storageUUID, command.actorUUID);
      const updated = aggregate.findCustomRoom(command.storageUUID);
      if (updated) await this.customRoomRepository.save(updated, storageId);
    }

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok(undefined);
  }
}
