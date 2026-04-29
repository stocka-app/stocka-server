import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { DeletePermanentWarehouseCommand } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.command';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';

export type DeletePermanentWarehouseResult = Result<void, DomainException>;

@CommandHandler(DeletePermanentWarehouseCommand)
export class DeletePermanentWarehouseHandler implements ICommandHandler<DeletePermanentWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: DeletePermanentWarehouseCommand): Promise<DeletePermanentWarehouseResult> {
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    const transition = warehouse.markPermanentlyDeleted(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    await this.warehouseRepository.deleteByUUID(command.storageUUID);

    this.eventPublisher.mergeObjectContext(warehouse);
    warehouse.commit();

    return ok(undefined);
  }
}
