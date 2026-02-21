import { IEvent } from '@nestjs/cqrs';

export class AccountBecameFlexibleEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly trigger: 'oauth_link' | 'password_set',
    public readonly occurredOn: Date = new Date(),
  ) {}
}
