import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v7 as uuidV7 } from 'uuid';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
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
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateStoreRoomCommand): Promise<CreateStoreRoomResult> {
    const capabilities = await this.capabilitiesPort.getCapabilities(command.tenantUUID);

    const currentCount = await this.storeRoomRepository.count(command.tenantUUID);

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

    const container = await this.storageRepository.findOrCreate(command.tenantUUID);
    if (container.id === undefined) {
      throw new Error('Storage container persisted without id; repository invariant violated');
    }

    const storeRoom = StoreRoomAggregate.create({
      uuid: uuidV7(),
      tenantUUID: command.tenantUUID,
      actorUUID: command.actorUUID,
      name: command.name,
      description: command.description,
      icon: resolveStorageIcon(StorageType.STORE_ROOM),
      color: resolveStorageColor(StorageType.STORE_ROOM),
      address: command.address,
    });

    await this.storeRoomRepository.save(storeRoom, container.id);

    this.eventPublisher.mergeObjectContext(storeRoom);
    storeRoom.commit();

    return ok({ storageUUID: storeRoom.uuid });
  }
}
