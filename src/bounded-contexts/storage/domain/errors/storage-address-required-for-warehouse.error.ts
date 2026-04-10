import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StorageAddressRequiredForWarehouseError extends BusinessLogicException {
  constructor(identifier: string) {
    super(
      `Storage "${identifier}" is a warehouse and requires a physical address.`,
      'STORAGE_ADDRESS_REQUIRED_FOR_WAREHOUSE',
    );
  }
}
