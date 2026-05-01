import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { RestoreCustomRoomCommand } from '@storage/application/commands/restore-custom-room/restore-custom-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { StorageItemView } from '@storage/domain/schemas';

export type RestoreCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(RestoreCustomRoomCommand)
export class RestoreCustomRoomHandler implements ICommandHandler<RestoreCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RestoreCustomRoomCommand): Promise<RestoreCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    const capacityError = await this.policy.assertCustomRoomCanRestore(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const transition = customRoom.markRestored(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundException(command.storageUUID));

    const saved = await this.customRoomRepository.save(customRoom, storageId);

    this.eventPublisher.mergeObjectContext(customRoom);
    customRoom.commit();

    return ok(StorageItemViewMapper.fromCustomRoom(saved));
  }
}
