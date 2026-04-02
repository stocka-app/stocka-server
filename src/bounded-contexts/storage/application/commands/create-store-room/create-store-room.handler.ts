import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import {
  resolveStorageIcon,
  resolveStorageColor,
} from '@storage/domain/services/storage-icon-color.resolver';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type CreateStoreRoomResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(CreateStoreRoomCommand)
export class CreateStoreRoomHandler implements ICommandHandler<CreateStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateStoreRoomCommand): Promise<CreateStoreRoomResult> {
    const capabilities = await this.capabilitiesPort.getCapabilities(command.tenantUUID);

    const currentCount = await this.storageRepository.countActiveByType(
      command.tenantUUID,
      StorageType.STORE_ROOM,
    );

    if (!capabilities.canCreateMoreStoreRooms(currentCount)) {
      return err(new StoreRoomLimitReachedError());
    }

    const nameExists = await this.storageRepository.existsActiveName(
      command.tenantUUID,
      command.name,
    );

    if (nameExists) {
      return err(new StorageNameAlreadyExistsError(command.name));
    }

    const aggregate = StorageAggregate.createStoreRoom({
      tenantUUID: command.tenantUUID,
      name: command.name,
      description: command.description,
      icon: resolveStorageIcon(StorageType.STORE_ROOM),
      color: resolveStorageColor(StorageType.STORE_ROOM),
      address: command.address,
      parentUUID: command.parentUUID,
    });

    const saved = await this.storageRepository.save(aggregate);

    this.eventPublisher.mergeObjectContext(saved);
    saved.commit();

    return ok({ storageUUID: saved.uuid });
  }
}
