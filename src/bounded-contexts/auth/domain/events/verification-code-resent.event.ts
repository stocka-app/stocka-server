import { IEvent } from '@nestjs/cqrs';

export class VerificationCodeResentEvent implements IEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly code: string,
    public readonly resendCount: number,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
