import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class StorageHierarchyInvalidError extends BusinessLogicException {
  constructor(childType: StorageType, parentType: StorageType) {
    super(`A ${childType} cannot be a child of ${parentType}`, 'STORAGE_HIERARCHY_INVALID');
  }
}
