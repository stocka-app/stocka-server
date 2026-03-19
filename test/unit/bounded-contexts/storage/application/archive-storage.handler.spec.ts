import { EventPublisher } from '@nestjs/cqrs';
import { ArchiveStorageHandler } from '@storage/application/commands/archive-storage/archive-storage.handler';
import { ArchiveStorageCommand } from '@storage/application/commands/archive-storage/archive-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';

describe('ArchiveStorageHandler', () => {
  let handler: ArchiveStorageHandler;
  let storageRepository: jest.Mocked<IStorageRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
  const STORAGE_UUID = '019538a0-0000-7000-8000-000000000099';

  const mockMergeObjectContext = jest.fn((aggregate: StorageAggregate): StorageAggregate => {
    aggregate.commit = jest.fn();
    return aggregate;
  });

  beforeEach(() => {
    storageRepository = {
      findByUUID: jest.fn(),
      findAllActive: jest.fn(),
      countActiveByType: jest.fn(),
      existsActiveName: jest.fn(),
      save: jest.fn(),
      archive: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: mockMergeObjectContext,
    } as unknown as jest.Mocked<EventPublisher>;

    handler = new ArchiveStorageHandler(storageRepository, eventPublisher);
  });

  describe('Given a storage that does not exist', () => {
    describe('When the archive command is executed', () => {
      it('Then it returns a StorageNotFoundError', async () => {
        storageRepository.findByUUID.mockResolvedValue(null);

        const command = new ArchiveStorageCommand(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StorageNotFoundError));
      });
    });
  });

  describe('Given a storage that is already archived', () => {
    describe('When the archive command is executed', () => {
      it('Then it returns a StorageAlreadyArchivedError', async () => {
        const archivedStorage = StorageAggregate.reconstitute({
          id: 1,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          type: StorageType.CUSTOM_ROOM,
          name: 'Archived Storage',
          customRoom: null,
          storeRoom: null,
          warehouse: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: new Date(),
        });

        storageRepository.findByUUID.mockResolvedValue(archivedStorage);

        const command = new ArchiveStorageCommand(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StorageAlreadyArchivedError));
      });
    });
  });

  describe('Given an active storage', () => {
    describe('When the archive command is executed', () => {
      it('Then the storage is archived successfully', async () => {
        const activeStorage = StorageAggregate.reconstitute({
          id: 1,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          type: StorageType.STORE_ROOM,
          name: 'Active Storage',
          customRoom: null,
          storeRoom: null,
          warehouse: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        storageRepository.findByUUID.mockResolvedValue(activeStorage);
        storageRepository.archive.mockResolvedValue(undefined);

        const command = new ArchiveStorageCommand(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(storageRepository.archive).toHaveBeenCalledTimes(1);
        expect(mockMergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });
});
