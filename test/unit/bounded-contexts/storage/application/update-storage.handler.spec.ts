import { EventPublisher } from '@nestjs/cqrs';
import { UpdateStorageHandler } from '@storage/application/commands/update-storage/update-storage.handler';
import { UpdateStorageCommand } from '@storage/application/commands/update-storage/update-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';

describe('UpdateStorageHandler', () => {
  let handler: UpdateStorageHandler;
  let storageRepository: jest.Mocked<IStorageRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
  const STORAGE_UUID = '019538a0-0000-7000-8000-000000000099';

  function createExistingStorage(): StorageAggregate {
    return StorageAggregate.reconstitute({
      id: 1,
      uuid: STORAGE_UUID,
      tenantUUID: TENANT_UUID,
      type: StorageType.CUSTOM_ROOM,
      name: 'Old Name',
      description: null,
      customRoom: null,
      storeRoom: null,
      warehouse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      frozenAt: null,
    });
  }

  const mockMergeObjectContext = jest.fn((aggregate: StorageAggregate): StorageAggregate => {
    aggregate.commit = jest.fn();
    return aggregate;
  });

  beforeEach(() => {
    storageRepository = {
      findByUUID: jest.fn(),
      findAll: jest.fn(),
      countActiveByType: jest.fn(),
      existsActiveName: jest.fn(),
      save: jest.fn(),
      archive: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: mockMergeObjectContext,
    } as unknown as jest.Mocked<EventPublisher>;

    handler = new UpdateStorageHandler(storageRepository, eventPublisher);
  });

  describe('Given a storage that does not exist', () => {
    describe('When the update command is executed', () => {
      it('Then it returns a StorageNotFoundError', async () => {
        storageRepository.findByUUID.mockResolvedValue(null);

        const command = new UpdateStorageCommand(STORAGE_UUID, TENANT_UUID, 'New Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StorageNotFoundError));
      });
    });
  });

  describe('Given a storage exists but the new name already belongs to another storage', () => {
    describe('When the update command is executed', () => {
      it('Then it returns a StorageNameAlreadyExistsError', async () => {
        storageRepository.findByUUID.mockResolvedValue(createExistingStorage());
        storageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateStorageCommand(STORAGE_UUID, TENANT_UUID, 'Duplicate Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StorageNameAlreadyExistsError));
      });
    });
  });

  describe('Given a storage exists and the new name is unique', () => {
    describe('When the update command is executed', () => {
      it('Then the storage name is updated and the UUID is returned', async () => {
        storageRepository.findByUUID.mockResolvedValue(createExistingStorage());
        storageRepository.existsActiveName.mockResolvedValue(false);
        storageRepository.save.mockImplementation(
          (aggregate: StorageAggregate): Promise<StorageAggregate> => Promise.resolve(aggregate),
        );

        const command = new UpdateStorageCommand(STORAGE_UUID, TENANT_UUID, 'New Name');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        result.map((data) => {
          expect(data.storageUUID).toBe(STORAGE_UUID);
        });
        expect(storageRepository.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a storage exists and no name is provided for update', () => {
    describe('When the update command is executed', () => {
      it('Then the storage is saved without name change', async () => {
        storageRepository.findByUUID.mockResolvedValue(createExistingStorage());
        storageRepository.save.mockImplementation(
          (aggregate: StorageAggregate): Promise<StorageAggregate> => Promise.resolve(aggregate),
        );

        const command = new UpdateStorageCommand(STORAGE_UUID, TENANT_UUID, undefined);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(storageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a storage exists and the name is the same as the current one', () => {
    describe('When the update command is executed', () => {
      it('Then the storage is saved without a name uniqueness check', async () => {
        storageRepository.findByUUID.mockResolvedValue(createExistingStorage());
        storageRepository.save.mockImplementation(
          (aggregate: StorageAggregate): Promise<StorageAggregate> => Promise.resolve(aggregate),
        );

        const command = new UpdateStorageCommand(STORAGE_UUID, TENANT_UUID, 'Old Name');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(storageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });
  });
});
