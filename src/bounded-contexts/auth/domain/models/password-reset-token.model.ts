import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { TokenHashVO } from '@shared/domain/value-objects/primitive/token-hash.vo';
import { ExpiresAtVO } from '@shared/domain/value-objects/compound/expires-at.vo';
import { UsedAtVO } from '@auth/domain/value-objects/used-at.vo';
import { PasswordResetRequestedEvent } from '@auth/domain/events/password-reset-requested.event';
import { PasswordResetCompletedEvent } from '@auth/domain/events/password-reset-completed.event';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export interface PasswordResetTokenProps extends AggregateRootProps {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  email?: string;
}

export class PasswordResetTokenModel extends AggregateRoot {
  private _userId: number;
  private _tokenHash: TokenHashVO;
  private _expiresAt: ExpiresAtVO;
  private _usedAt: UsedAtVO | null;

  private constructor(props: PasswordResetTokenProps) {
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
    this._usedAt = props.usedAt ? new UsedAtVO(props.usedAt) : null;
  }

  static create(
    props: Omit<PasswordResetTokenProps, 'id'> & {
      email: string;
      plainToken: string;
      lang?: Locale;
      isSocialAccount?: boolean;
      provider?: string | null;
    },
  ): PasswordResetTokenModel {
    const token = new PasswordResetTokenModel(props);
    token.apply(
      new PasswordResetRequestedEvent(
        token.userId,
        props.email,
        props.plainToken,
        props.lang ?? 'es',
        props.isSocialAccount ?? false,
        props.provider ?? null,
      ),
    );
    return token;
  }

  static reconstitute(
    props: PasswordResetTokenProps & { id: number; uuid: string },
  ): PasswordResetTokenModel {
    return new PasswordResetTokenModel(props);
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

  get usedAt(): Date | null {
    return this._usedAt?.toDate() ?? null;
  }

  isExpired(): boolean {
    return this._expiresAt.isExpired();
  }

  isUsed(): boolean {
    return this._usedAt !== null;
  }

  isValid(): boolean {
    return !this.isArchived() && !this.isExpired() && !this.isUsed();
  }

  markAsUsed(): void {
    this._usedAt = UsedAtVO.now();
    this.touch();
    this.apply(new PasswordResetCompletedEvent(this.userId));
  }
}
