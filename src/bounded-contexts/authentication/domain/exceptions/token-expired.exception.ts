import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class TokenExpiredException extends BusinessLogicException {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED', []);
  }
}
