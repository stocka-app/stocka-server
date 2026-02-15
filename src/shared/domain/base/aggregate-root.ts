import { AggregateRoot as CQRSAggregateRoot, IEvent } from '@nestjs/cqrs';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

export interface AggregateRootProps {
  id?: number;
  uuid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date | null;
}

export abstract class AggregateRoot<
  EventBase extends IEvent = IEvent,
> extends CQRSAggregateRoot<EventBase> {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  constructor(props?: AggregateRootProps) {
    super();
    this._id = props?.id;
    this._uuid = new UUIDVO(props?.uuid);
    this._createdAt = props?.createdAt ?? new Date();
    this._updatedAt = props?.updatedAt ?? new Date();
    this._archivedAt = props?.archivedAt ?? null;
  }

  get id(): number | undefined {
    return this._id;
  }

  get uuid(): string {
    return this._uuid.toString();
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  isArchived(): boolean {
    return this._archivedAt !== null;
  }

  archive(): void {
    this._archivedAt = new Date();
    this._updatedAt = new Date();
  }

  restore(): void {
    this._archivedAt = null;
    this._updatedAt = new Date();
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }
}
