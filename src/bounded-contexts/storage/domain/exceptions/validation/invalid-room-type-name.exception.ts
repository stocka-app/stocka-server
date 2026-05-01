import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoomTypeNameException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_ROOM_TYPE_NAME', [{ field: 'roomType', message }]);
  }
}
