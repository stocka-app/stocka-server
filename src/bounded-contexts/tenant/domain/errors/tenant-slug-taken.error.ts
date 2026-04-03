import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class TenantSlugTakenError extends DomainException {
  constructor(slug: string) {
    super(`A tenant with slug "${slug}" already exists`, 'TENANT_SLUG_TAKEN');
  }
}
