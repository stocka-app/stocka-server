import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ArchiveStorageCommand } from '@storage/application/commands/archive-storage/archive-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type ArchiveStorageResult = Result<void, DomainException>;

@CommandHandler(ArchiveStorageCommand)
export class ArchiveStorageHandler implements ICommandHandler<ArchiveStorageCommand> {
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

  async execute(command: ArchiveStorageCommand): Promise<ArchiveStorageResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const view = aggregate.findItemView(command.storageUUID);

    if (!view) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (view.archivedAt !== null) {
      return err(new StorageAlreadyArchivedError(command.storageUUID));
    }

    if (view.type === StorageType.WAREHOUSE) {
      aggregate.archiveWarehouse(command.storageUUID, command.actorUUID);
      const updated = aggregate.findWarehouse(command.storageUUID)!;
      await this.warehouseRepository.save(updated, aggregate.id!);
    } else if (view.type === StorageType.STORE_ROOM) {
      aggregate.archiveStoreRoom(command.storageUUID, command.actorUUID);
      const updated = aggregate.findStoreRoom(command.storageUUID)!;
      await this.storeRoomRepository.save(updated, aggregate.id!);
    } else {
      aggregate.archiveCustomRoom(command.storageUUID, command.actorUUID);
      const updated = aggregate.findCustomRoom(command.storageUUID)!;
      await this.customRoomRepository.save(updated, aggregate.id!);
    }

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok(undefined);
  }
}
