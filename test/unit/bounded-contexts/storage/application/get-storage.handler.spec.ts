import { GetStorageHandler } from '@storage/application/queries/get-storage/get-storage.handler';
import { GetStorageQuery } from '@storage/application/queries/get-storage/get-storage.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';

describe('GetStorageHandler', () => {
  let handler: GetStorageHandler;
  let storageRepository: jest.Mocked<IStorageRepository>;

  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
  const STORAGE_UUID = '019538a0-0000-7000-8000-000000000099';

  beforeEach(() => {
    storageRepository = {
      findByUUID: jest.fn(),
      findAll: jest.fn(),
      countActiveByType: jest.fn(),
      existsActiveName: jest.fn(),
      save: jest.fn(),
      archive: jest.fn(),
    };

    handler = new GetStorageHandler(storageRepository);
  });

  describe('Given a storage that does not exist', () => {
    describe('When the get query is executed', () => {
      it('Then it returns a StorageNotFoundError', async () => {
        storageRepository.findByUUID.mockResolvedValue(null);

        const query = new GetStorageQuery(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(query);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StorageNotFoundError));
      });
    });
  });

  describe('Given a storage exists for the tenant', () => {
    describe('When the get query is executed', () => {
      it('Then it returns the storage aggregate', async () => {
        const storage = StorageAggregate.reconstitute({
          id: 1,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          type: StorageType.CUSTOM_ROOM,
          name: 'My Room',
          description: null,
          customRoom: null,
          storeRoom: null,
          warehouse: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        storageRepository.findByUUID.mockResolvedValue(storage);

        const query = new GetStorageQuery(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(query);

        expect(result.isOk()).toBe(true);
        result.map((s) => {
          expect(s.uuid).toBe(STORAGE_UUID);
          expect(s.name).toBe('My Room');
        });
      });
    });
  });
});
