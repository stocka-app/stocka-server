import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { DeletePermanentWarehouseCommand } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.command';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StoragePermanentlyDeletedEvent } from '@storage/domain/events/storage-permanently-deleted.event';

export type DeletePermanentWarehouseResult = Result<void, DomainException>;

@CommandHandler(DeletePermanentWarehouseCommand)
export class DeletePermanentWarehouseHandler implements ICommandHandler<DeletePermanentWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeletePermanentWarehouseCommand): Promise<DeletePermanentWarehouseResult> {
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (!warehouse.isArchived()) return err(new StorageNotArchivedError(command.storageUUID));

    const storageName = warehouse.name.getValue();

    await this.warehouseRepository.deleteByUUID(command.storageUUID);

    void this.eventBus.publish(
      new StoragePermanentlyDeletedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.WAREHOUSE,
        storageName,
      ),
    );

    return ok(undefined);
  }
}
