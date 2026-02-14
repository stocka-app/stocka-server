import { ResourceNotFoundException } from '@shared/domain/exceptions/resource-not-found.exception';

export class UserNotFoundException extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('User', identifier, 'USER_NOT_FOUND');
  }
}
