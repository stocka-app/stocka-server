import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class CustomRoomLimitReachedError extends BusinessLogicException {
  constructor() {
    super(
      'You have reached the maximum number of custom rooms for your plan',
      'CUSTOM_ROOM_LIMIT_REACHED',
    );
  }
}
