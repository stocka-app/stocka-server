import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidSubscriptionEventActorTypeException extends DomainException {
  constructor(value: string) {
    super(
      `Invalid subscription event actor type: ${value}`,
      'INVALID_SUBSCRIPTION_EVENT_ACTOR_TYPE',
      [{ field: 'actorType', message: `Invalid subscription event actor type: ${value}` }],
    );
  }
}
