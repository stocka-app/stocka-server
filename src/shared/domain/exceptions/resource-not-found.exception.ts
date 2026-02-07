import { DomainException } from '@/shared/domain/exceptions/domain.exception';

export abstract class ResourceNotFoundException extends DomainException {
  constructor(resource: string, identifier: string, errorCode: string = 'RESOURCE_NOT_FOUND') {
    super(`${resource} not found with identifier: ${identifier}`, errorCode, []);
  }
}
