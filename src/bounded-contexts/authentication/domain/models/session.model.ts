import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { TokenHashVO } from '@shared/domain/value-objects/primitive/token-hash.vo';
import { ExpiresAtVO } from '@shared/domain/value-objects/compound/expires-at.vo';
import { SessionCreatedEvent } from '@authentication/domain/events/session-created.event';

export interface SessionProps extends AggregateRootProps {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}

export class SessionModel extends AggregateRoot {
  private _userId: number;
  private _tokenHash: TokenHashVO;
  private _expiresAt: ExpiresAtVO;

  private constructor(props: SessionProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userId = props.userId;
    this._tokenHash = new TokenHashVO(props.tokenHash);
    this._expiresAt = new ExpiresAtVO(props.expiresAt);
  }

  static create(props: Omit<SessionProps, 'id'>): SessionModel {
    const session = new SessionModel(props);
    session.apply(new SessionCreatedEvent(session.uuid, session.userId));
    return session;
  }

  static reconstitute(props: SessionProps & { id: number; uuid: string }): SessionModel {
    return new SessionModel(props);
  }

  get userId(): number {
    return this._userId;
  }

  get tokenHash(): string {
    return this._tokenHash.getValue();
  }

  get expiresAt(): Date {
    return this._expiresAt.toDate();
  }

  isExpired(): boolean {
    return this._expiresAt.isExpired();
  }

  isValid(): boolean {
    return !this.isArchived() && !this.isExpired();
  }
}
