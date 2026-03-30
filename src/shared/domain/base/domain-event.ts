import { IEvent } from '@nestjs/cqrs';

export abstract class DomainEvent implements IEvent {
  readonly occurredOn: Date;

  constructor() {
    this.occurredOn = new Date();
  }

  get eventName(): string {
    return this.constructor.name;
  }
}
