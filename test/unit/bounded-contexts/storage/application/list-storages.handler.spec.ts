import { ListStoragesHandler } from '@storage/application/queries/list-storages/list-storages.handler';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { IStorageRepository, StoragePage } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';

describe('ListStoragesHandler', () => {
  let handler: ListStoragesHandler;
  let storageRepository: jest.Mocked<IStorageRepository>;

  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

  function makeStorage(
    overrides: { type?: StorageType; archivedAt?: Date | null; frozenAt?: Date | null } = {},
  ): StorageAggregate {
    return StorageAggregate.reconstitute({
      id: 1,
      uuid: '019538a0-0000-7000-8000-000000000010',
      tenantUUID: TENANT_UUID,
      type: overrides.type ?? StorageType.CUSTOM_ROOM,
      name: 'Test Storage',
      description: null,
      customRoom: null,
      storeRoom: null,
      warehouse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: overrides.archivedAt ?? null,
      frozenAt: overrides.frozenAt ?? null,
    });
  }

  function makePage(items: StorageAggregate[], total?: number): StoragePage {
    return { items, total: total ?? items.length };
  }

  beforeEach(() => {
    storageRepository = {
      findByUUID: jest.fn(),
      findAll: jest.fn(),
      countActiveByType: jest.fn(),
      existsActiveName: jest.fn(),
      save: jest.fn(),
      archive: jest.fn(),
    };

    handler = new ListStoragesHandler(storageRepository);
  });

  // ── H-L2: no filter → returns all storages ─────────────────────────────────

  describe('Given a tenant with no storages', () => {
    describe('When the list query is executed without filters', () => {
      it('Then it returns an empty page', async () => {
        storageRepository.findAll.mockResolvedValue({ items: [], total: 0 });

        const query = new ListStoragesQuery(TENANT_UUID);
        const result = await handler.execute(query);

        expect(result).toEqual({ items: [], total: 0 });
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          undefined,
          'ASC',
        );
      });
    });
  });

  describe('Given a tenant with storages in various states', () => {
    describe('When the list query is executed without filters', () => {
      it('Then it returns all storages regardless of status', async () => {
        const activeStorage = makeStorage();
        const archivedStorage = makeStorage({ archivedAt: new Date() });
        storageRepository.findAll.mockResolvedValue(makePage([activeStorage, archivedStorage]));

        const query = new ListStoragesQuery(TENANT_UUID);
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          undefined,
          'ASC',
        );
      });
    });
  });

  // ── H-L2 (STOC-326): status=ACTIVE → only active storages ─────────────────

  describe('Given a tenant with active and archived storages', () => {
    describe('When the list query is executed with status=ACTIVE', () => {
      it('Then it returns only active storages', async () => {
        const activeStorage = makeStorage();
        storageRepository.findAll.mockResolvedValue(makePage([activeStorage]));

        const query = new ListStoragesQuery(TENANT_UUID, { status: StorageStatus.ACTIVE });
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].status).toBe(StorageStatus.ACTIVE);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          { status: StorageStatus.ACTIVE },
          { page: 1, limit: 50 },
          undefined,
          'ASC',
        );
      });
    });
  });

  // ── H-L1 (STOC-324): status=FROZEN → only frozen storages ──────────────────

  describe('Given the tenant has frozen storages', () => {
    describe('When the list query is executed with status=FROZEN', () => {
      it('Then it returns only frozen storages', async () => {
        const frozenStorage = makeStorage();
        storageRepository.findAll.mockResolvedValue(makePage([frozenStorage]));

        const query = new ListStoragesQuery(TENANT_UUID, { status: StorageStatus.FROZEN });
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          { status: StorageStatus.FROZEN },
          { page: 1, limit: 50 },
          undefined,
          'ASC',
        );
      });
    });
  });

  // ── H-L3: type=WAREHOUSE → only warehouses ─────────────────────────────────

  describe('Given the tenant has mixed storage types', () => {
    describe('When the list query is executed with type=WAREHOUSE', () => {
      it('Then it returns only warehouses', async () => {
        const warehouse = makeStorage({ type: StorageType.WAREHOUSE });
        storageRepository.findAll.mockResolvedValue(makePage([warehouse]));

        const query = new ListStoragesQuery(TENANT_UUID, { type: StorageType.WAREHOUSE });
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].type).toBe(StorageType.WAREHOUSE);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          { type: StorageType.WAREHOUSE },
          { page: 1, limit: 50 },
          undefined,
          'ASC',
        );
      });
    });
  });

  // ── H-L4: both filters → AND logic ─────────────────────────────────────────

  describe('Given the tenant has active warehouses and active custom rooms', () => {
    describe('When the list query is executed with status=ACTIVE and type=WAREHOUSE', () => {
      it('Then it applies both filters with AND logic', async () => {
        const warehouse = makeStorage({ type: StorageType.WAREHOUSE });
        storageRepository.findAll.mockResolvedValue(makePage([warehouse]));

        const query = new ListStoragesQuery(TENANT_UUID, {
          status: StorageStatus.ACTIVE,
          type: StorageType.WAREHOUSE,
        });
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].type).toBe(StorageType.WAREHOUSE);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          { status: StorageStatus.ACTIVE, type: StorageType.WAREHOUSE },
          { page: 1, limit: 50 },
          undefined,
          'ASC',
        );
      });
    });
  });

  // ── H-L5: pagination — custom page and limit ────────────────────────────────

  describe('Given a tenant with many storages', () => {
    describe('When the list query is executed with page=2 and limit=10', () => {
      it('Then it forwards the pagination params to the repository', async () => {
        const storage = makeStorage();
        storageRepository.findAll.mockResolvedValue({ items: [storage], total: 25 });

        const query = new ListStoragesQuery(
          TENANT_UUID,
          undefined,
          { page: 2, limit: 10 },
          undefined,
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(25);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          undefined,
          { page: 2, limit: 10 },
          undefined,
          'ASC',
        );
      });
    });
  });

  // ── H-L6: search by name ────────────────────────────────────────────────────

  describe('Given a tenant with storages whose names contain a keyword', () => {
    describe('When the list query is executed with a search term', () => {
      it('Then it forwards the search term to the repository', async () => {
        const storage = makeStorage();
        storageRepository.findAll.mockResolvedValue(makePage([storage]));

        const query = new ListStoragesQuery(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          'almacén',
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          'almacén',
          'ASC',
        );
      });
    });
  });

  // ── H-L7: sortOrder DESC ─────────────────────────────────────────────────────

  describe('Given a tenant with storages', () => {
    describe('When the list query is executed with sortOrder=DESC', () => {
      it('Then it forwards sortOrder DESC to the repository', async () => {
        const storage = makeStorage();
        storageRepository.findAll.mockResolvedValue(makePage([storage]));

        const query = new ListStoragesQuery(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          undefined,
          'DESC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(storageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          undefined,
          'DESC',
        );
      });
    });
  });
});
