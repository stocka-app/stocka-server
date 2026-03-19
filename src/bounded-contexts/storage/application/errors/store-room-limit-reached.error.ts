import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class StoreRoomLimitReachedError extends BusinessLogicException {
  constructor() {
    super(
      'You have reached the maximum number of store rooms for your plan',
      'STORE_ROOM_LIMIT_REACHED',
    );
  }
}
