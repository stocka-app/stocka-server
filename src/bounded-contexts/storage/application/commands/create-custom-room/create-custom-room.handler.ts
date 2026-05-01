import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v7 as uuidV7 } from 'uuid';
import { CreateCustomRoomCommand } from '@storage/application/commands/create-custom-room/create-custom-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import {
  resolveStorageIcon,
  resolveStorageColor,
} from '@storage/domain/services/storage-icon-color.resolver';
import { StorageNameAlreadyExistsException } from '@storage/domain/exceptions/business/storage-name-already-exists.exception';
import { CustomRoomLimitReachedException } from '@storage/application/errors/custom-room-limit-reached.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type CreateCustomRoomResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(CreateCustomRoomCommand)
export class CreateCustomRoomHandler implements ICommandHandler<CreateCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateCustomRoomCommand): Promise<CreateCustomRoomResult> {
    const capabilities = await this.capabilitiesPort.getCapabilities(command.tenantUUID);

    const currentCount = await this.customRoomRepository.count(command.tenantUUID);

    if (!capabilities.canCreateMoreCustomRooms(currentCount)) {
      return err(new CustomRoomLimitReachedException());
    }

    const nameExists = await this.storageRepository.existsActiveName(
      command.tenantUUID,
      command.name,
    );

    if (nameExists) {
      return err(new StorageNameAlreadyExistsException(command.name));
    }

    const container = await this.storageRepository.findOrCreate(command.tenantUUID);
    if (container.id === undefined) {
      throw new Error('Storage container persisted without id; repository invariant violated');
    }

    const customRoom = CustomRoomAggregate.create({
      uuid: uuidV7(),
      tenantUUID: command.tenantUUID,
      actorUUID: command.actorUUID,
      name: command.name,
      roomType: command.roomType,
      description: command.description,
      icon: resolveStorageIcon(StorageType.CUSTOM_ROOM, command.icon),
      color: resolveStorageColor(StorageType.CUSTOM_ROOM, command.color),
      address: command.address,
    });

    await this.customRoomRepository.save(customRoom, container.id);

    this.eventPublisher.mergeObjectContext(customRoom);
    customRoom.commit();

    return ok({ storageUUID: customRoom.uuid });
  }
}
