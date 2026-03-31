import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { TokenHashVO } from '@shared/domain/value-objects/primitive/token-hash.vo';
import { ExpiresAtVO } from '@shared/domain/value-objects/compound/expires-at.vo';
import { SessionCreatedEvent } from '@user/account/session/domain/events/session-created.event';

export interface SessionAggregateProps extends AggregateRootProps {
  accountId: number;
  tokenHash: string;
  expiresAt: Date;
}

export interface SessionAggregateReconstitueProps {
  id: number;
  uuid: string;
  accountId: number;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class SessionAggregate extends AggregateRoot {
  private readonly _accountId: number;
  private readonly _tokenHash: TokenHashVO;
  private readonly _expiresAt: ExpiresAtVO;

  private constructor(props: SessionAggregateProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._accountId = props.accountId;
    this._tokenHash = new TokenHashVO(props.tokenHash);
    this._expiresAt = new ExpiresAtVO(props.expiresAt);
  }

  static create(props: {
    accountId: number;
    tokenHash: string;
    expiresAt: Date;
  }): SessionAggregate {
    const session = new SessionAggregate({
      accountId: props.accountId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
    });
    session.apply(new SessionCreatedEvent(session.uuid, session.accountId));
    return session;
  }

  static reconstitute(props: SessionAggregateReconstitueProps): SessionAggregate {
    return new SessionAggregate(props);
  }

  get accountId(): number {
    return this._accountId;
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
