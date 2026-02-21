import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
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
  private _tokenHash: string;
  private _expiresAt: Date;
  private _usedAt: Date | null;

  private constructor(props: PasswordResetTokenProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userId = props.userId;
    this._tokenHash = props.tokenHash;
    this._expiresAt = props.expiresAt;
    this._usedAt = props.usedAt ?? null;
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
    return this._tokenHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  isUsed(): boolean {
    return this._usedAt !== null;
  }

  isValid(): boolean {
    return !this.isArchived() && !this.isExpired() && !this.isUsed();
  }

  markAsUsed(): void {
    this._usedAt = new Date();
    this.touch();
    this.apply(new PasswordResetCompletedEvent(this.userId));
  }
}
