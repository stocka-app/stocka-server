import { IEvent } from '@nestjs/cqrs';

export class UserVerificationBlockedEvent implements IEvent {
  constructor(
    public readonly userUuid: string,
    public readonly email: string,
    public readonly blockedUntil: Date,
    public readonly reason: 'too_many_attempts' | 'rate_limit_exceeded',
    public readonly occurredOn: Date = new Date(),
  ) {}
}
