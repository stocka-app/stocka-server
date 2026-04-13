import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { StorageItemView } from '@storage/domain/schemas';
import { UnfreezeCustomRoomCommand } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.command';

export type UnfreezeCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(UnfreezeCustomRoomCommand)
export class UnfreezeCustomRoomHandler implements ICommandHandler<UnfreezeCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UnfreezeCustomRoomCommand): Promise<UnfreezeCustomRoomResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);
    const customRoom = aggregate.findCustomRoom(command.storageUUID);

    if (!customRoom) return err(new StorageNotFoundError(command.storageUUID));
    if (!customRoom.isFrozen()) return err(new StorageNotFrozenError(command.storageUUID));

    aggregate.unfreezeCustomRoom(command.storageUUID, command.actorUUID);

    const updated = aggregate.findCustomRoom(command.storageUUID);
    if (!updated || aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    await this.customRoomRepository.save(updated, aggregate.id);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    const view = aggregate.findItemView(command.storageUUID);
    if (!view) return err(new StorageNotFoundError(command.storageUUID));

    return ok(view);
  }
}
