import { ListStoragesHandler } from '@storage/application/queries/list-storages/list-storages.handler';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

describe('ListStoragesHandler', () => {
  let handler: ListStoragesHandler;
  let storageRepository: jest.Mocked<IStorageRepository>;

  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

  beforeEach(() => {
    storageRepository = {
      findByUUID: jest.fn(),
      findAllActive: jest.fn(),
      countActiveByType: jest.fn(),
      existsActiveName: jest.fn(),
      save: jest.fn(),
      archive: jest.fn(),
    };

    handler = new ListStoragesHandler(storageRepository);
  });

  describe('Given a tenant with no active storages', () => {
    describe('When the list query is executed', () => {
      it('Then it returns an empty array', async () => {
        storageRepository.findAllActive.mockResolvedValue([]);

        const query = new ListStoragesQuery(TENANT_UUID);
        const result = await handler.execute(query);

        expect(result).toEqual([]);
        expect(storageRepository.findAllActive).toHaveBeenCalledWith(TENANT_UUID);
      });
    });
  });

  describe('Given a tenant with active storages', () => {
    describe('When the list query is executed', () => {
      it('Then it returns the list of storages', async () => {
        const storages = [
          StorageAggregate.reconstitute({
            id: 1,
            uuid: '019538a0-0000-7000-8000-000000000010',
            tenantUUID: TENANT_UUID,
            type: StorageType.CUSTOM_ROOM,
            name: 'Room A',
            customRoom: null,
            storeRoom: null,
            warehouse: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            archivedAt: null,
          }),
          StorageAggregate.reconstitute({
            id: 2,
            uuid: '019538a0-0000-7000-8000-000000000020',
            tenantUUID: TENANT_UUID,
            type: StorageType.STORE_ROOM,
            name: 'Bodega B',
            customRoom: null,
            storeRoom: null,
            warehouse: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            archivedAt: null,
          }),
        ];

        storageRepository.findAllActive.mockResolvedValue(storages);

        const query = new ListStoragesQuery(TENANT_UUID);
        const result = await handler.execute(query);

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Room A');
        expect(result[1].name).toBe('Bodega B');
      });
    });
  });
});
