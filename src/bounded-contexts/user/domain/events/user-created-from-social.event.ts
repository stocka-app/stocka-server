import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserCreatedFromSocialEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly provider: string,
  ) {
    super();
  }
}
