import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ArchiveCustomRoomCommand } from '@storage/application/commands/archive-custom-room/archive-custom-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type ArchiveCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(ArchiveCustomRoomCommand)
export class ArchiveCustomRoomHandler implements ICommandHandler<ArchiveCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ArchiveCustomRoomCommand): Promise<ArchiveCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    const transition = customRoom.markArchived(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const saved = await this.customRoomRepository.save(customRoom, storageId);

    this.eventPublisher.mergeObjectContext(customRoom);
    customRoom.commit();

    return ok(StorageItemViewMapper.fromCustomRoom(saved));
  }
}
