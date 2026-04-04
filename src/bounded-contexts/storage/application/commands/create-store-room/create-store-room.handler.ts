import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v7 as uuidV7 } from 'uuid';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
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

    const currentCount = await this.storeRoomRepository.countActive(command.tenantUUID);

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

    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const model = StoreRoomModel.create({
      uuid: uuidV7(),
      tenantUUID: command.tenantUUID,
      name: command.name,
      description: command.description,
      icon: resolveStorageIcon(StorageType.STORE_ROOM),
      color: resolveStorageColor(StorageType.STORE_ROOM),
      address: command.address,
    });

    aggregate.addStoreRoom(model);

    await this.storeRoomRepository.save(model, aggregate.id!);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok({ storageUUID: model.uuid.toString() });
  }
}
