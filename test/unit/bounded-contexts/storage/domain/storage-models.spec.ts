import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';

// ── CustomRoomModel ─────────────────────────────────────────────────────────────

describe('CustomRoomModel', () => {
  describe('Given CustomRoomModel.create() is called with valid props', () => {
    describe('When creating a new custom room with an address', () => {
      it('Then all properties are set correctly', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000010',
          roomType: 'Office',
          address: '123 Main St',
        });

        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000010');
        expect(model.roomType).toBe('Office');
        expect(model.address).toBe('123 Main St');
        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('When creating a new custom room without an address', () => {
      it('Then the address is null', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000011',
          roomType: 'Storage',
        });

        expect(model.address).toBeNull();
      });
    });
  });

  describe('Given CustomRoomModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const now = new Date('2024-06-01');
        const model = CustomRoomModel.reconstitute({
          uuid: '019538a0-0000-7000-8000-000000000012',
          roomType: 'Kitchen',
          address: '456 Oak Ave',
          createdAt: now,
          updatedAt: now,
        });

        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000012');
        expect(model.roomType).toBe('Kitchen');
        expect(model.address).toBe('456 Oak Ave');
        expect(model.createdAt).toEqual(now);
      });
    });
  });
});

// ── StoreRoomModel ──────────────────────────────────────────────────────────────

describe('StoreRoomModel', () => {
  describe('Given StoreRoomModel.create() is called with valid props', () => {
    describe('When creating a new store room with an address', () => {
      it('Then all properties are set correctly', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000020',
          address: '789 Elm Rd',
        });

        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000020');
        expect(model.address).toBe('789 Elm Rd');
        expect(model.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('When creating a new store room without an address', () => {
      it('Then the address is null', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000021',
        });

        expect(model.address).toBeNull();
      });
    });
  });

  describe('Given StoreRoomModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const now = new Date('2024-07-01');
        const model = StoreRoomModel.reconstitute({
          uuid: '019538a0-0000-7000-8000-000000000022',
          address: '100 Industrial',
          createdAt: now,
          updatedAt: now,
        });

        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000022');
        expect(model.address).toBe('100 Industrial');
      });
    });
  });
});

// ── WarehouseModel ──────────────────────────────────────────────────────────────

describe('WarehouseModel', () => {
  describe('Given WarehouseModel.create() is called with valid props', () => {
    describe('When creating a new warehouse', () => {
      it('Then all properties are set correctly', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000030',
          address: '200 Warehouse Blvd',
        });

        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000030');
        expect(model.address).toBe('200 Warehouse Blvd');
        expect(model.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given WarehouseModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const now = new Date('2024-08-01');
        const model = WarehouseModel.reconstitute({
          uuid: '019538a0-0000-7000-8000-000000000031',
          address: '300 Depot Lane',
          createdAt: now,
          updatedAt: now,
        });

        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000031');
        expect(model.address).toBe('300 Depot Lane');
        expect(model.createdAt).toEqual(now);
      });
    });
  });
});
