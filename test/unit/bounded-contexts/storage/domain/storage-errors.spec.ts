import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageParentNotFoundError } from '@storage/domain/errors/storage-parent-not-found.error';
import { StorageHierarchyInvalidError } from '@storage/domain/errors/storage-hierarchy-invalid.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';
import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

describe('Storage domain errors', () => {
  describe('Given a StorageNotFoundError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends ResourceNotFoundException', () => {
        const error = new StorageNotFoundError('some-uuid');
        expect(error).toBeInstanceOf(ResourceNotFoundException);
        expect(error.errorCode).toBe('STORAGE_NOT_FOUND');
        expect(error.message).toContain('some-uuid');
      });
    });
  });

  describe('Given a StorageNameAlreadyExistsError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends BusinessLogicException', () => {
        const error = new StorageNameAlreadyExistsError('My Storage');
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('STORAGE_NAME_ALREADY_EXISTS');
        expect(error.message).toContain('My Storage');
      });
    });
  });

  describe('Given a StorageAlreadyArchivedError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends BusinessLogicException', () => {
        const error = new StorageAlreadyArchivedError('some-uuid');
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('STORAGE_ALREADY_ARCHIVED');
        expect(error.message).toContain('some-uuid');
      });
    });
  });

  describe('Given a StorageParentNotFoundError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends ResourceNotFoundException', () => {
        const error = new StorageParentNotFoundError('parent-uuid');
        expect(error).toBeInstanceOf(ResourceNotFoundException);
        expect(error.errorCode).toBe('STORAGE_PARENT_NOT_FOUND');
        expect(error.message).toContain('parent-uuid');
      });
    });
  });

  describe('Given a StorageHierarchyInvalidError', () => {
    describe('When it is instantiated with STORE_ROOM child and STORE_ROOM parent', () => {
      it('Then it has the correct error code and extends BusinessLogicException', () => {
        const error = new StorageHierarchyInvalidError(StorageType.STORE_ROOM, StorageType.STORE_ROOM);
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('STORAGE_HIERARCHY_INVALID');
        expect(error.message).toContain('STORE_ROOM');
      });
    });
  });

  describe('Given a CustomRoomLimitReachedError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends BusinessLogicException', () => {
        const error = new CustomRoomLimitReachedError();
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('CUSTOM_ROOM_LIMIT_REACHED');
      });
    });
  });

  describe('Given a StoreRoomLimitReachedError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends BusinessLogicException', () => {
        const error = new StoreRoomLimitReachedError();
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('STORE_ROOM_LIMIT_REACHED');
      });
    });
  });

  describe('Given a WarehouseRequiresTierUpgradeError', () => {
    describe('When it is instantiated', () => {
      it('Then it has the correct error code and extends BusinessLogicException', () => {
        const error = new WarehouseRequiresTierUpgradeError();
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('WAREHOUSE_REQUIRES_TIER_UPGRADE');
      });
    });
  });
});
