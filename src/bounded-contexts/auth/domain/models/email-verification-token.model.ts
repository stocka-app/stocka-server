import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { EmailVerificationRequestedEvent } from '@auth/domain/events/email-verification-requested.event';
import { EmailVerificationCompletedEvent } from '@auth/domain/events/email-verification-completed.event';
import { VerificationCodeResentEvent } from '@auth/domain/events/verification-code-resent.event';

export interface EmailVerificationTokenProps extends AggregateRootProps {
  userId: number;
  codeHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  resendCount?: number;
  lastResentAt?: Date | null;
  email?: string;
}

export class EmailVerificationTokenModel extends AggregateRoot {
  private _userId: number;
  private _codeHash: string;
  private _expiresAt: Date;
  private _usedAt: Date | null;
  private _resendCount: number;
  private _lastResentAt: Date | null;

  // Cooldown constants (in seconds)
  private static readonly RESEND_COOLDOWNS = [0, 60, 120, 300]; // 0s, 1m, 2m, 5m
  private static readonly MAX_RESENDS_PER_HOUR = 5;

  private constructor(props: EmailVerificationTokenProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userId = props.userId;
    this._codeHash = props.codeHash;
    this._expiresAt = props.expiresAt;
    this._usedAt = props.usedAt ?? null;
    this._resendCount = props.resendCount ?? 0;
    this._lastResentAt = props.lastResentAt ?? null;
  }

  static create(
    props: Omit<EmailVerificationTokenProps, 'id'> & { email: string; code?: string },
  ): EmailVerificationTokenModel {
    const token = new EmailVerificationTokenModel(props);
    if (props.code) {
      token.apply(new EmailVerificationRequestedEvent(token.userId, props.email, props.code));
    }
    return token;
  }

  static reconstitute(
    props: EmailVerificationTokenProps & { id: number; uuid: string },
  ): EmailVerificationTokenModel {
    return new EmailVerificationTokenModel(props);
  }

  get userId(): number {
    return this._userId;
  }

  get codeHash(): string {
    return this._codeHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  get resendCount(): number {
    return this._resendCount;
  }

  get lastResentAt(): Date | null {
    return this._lastResentAt;
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

  markAsUsed(userUUID: string, email: string): void {
    this._usedAt = new Date();
    this.touch();
    this.apply(new EmailVerificationCompletedEvent(userUUID, email));
  }

  canResend(): boolean {
    if (this._resendCount >= EmailVerificationTokenModel.MAX_RESENDS_PER_HOUR) {
      return false;
    }

    const cooldownSeconds = this.getCurrentCooldownSeconds();
    if (cooldownSeconds > 0) {
      const secondsSinceLastResend = this._lastResentAt
        ? Math.floor((Date.now() - this._lastResentAt.getTime()) / 1000)
        : Number.MAX_SAFE_INTEGER;

      return secondsSinceLastResend >= cooldownSeconds;
    }

    return true;
  }

  getCurrentCooldownSeconds(): number {
    const cooldownIndex = Math.min(
      this._resendCount,
      EmailVerificationTokenModel.RESEND_COOLDOWNS.length - 1,
    );
    return EmailVerificationTokenModel.RESEND_COOLDOWNS[cooldownIndex];
  }

  getSecondsUntilCanResend(): number {
    if (!this._lastResentAt) {
      return 0;
    }

    const cooldownSeconds = this.getCurrentCooldownSeconds();
    const secondsSinceLastResend = Math.floor((Date.now() - this._lastResentAt.getTime()) / 1000);
    return Math.max(0, cooldownSeconds - secondsSinceLastResend);
  }

  updateCode(newCodeHash: string, newExpiresAt: Date, email: string, code: string): void {
    this._codeHash = newCodeHash;
    this._expiresAt = newExpiresAt;
    this._resendCount += 1;
    this._lastResentAt = new Date();
    this.touch();
    this.apply(new VerificationCodeResentEvent(this.userId, email, code, this._resendCount));
  }

  getMaxResendsPerHour(): number {
    return EmailVerificationTokenModel.MAX_RESENDS_PER_HOUR;
  }

  getRemainingResends(): number {
    return Math.max(0, EmailVerificationTokenModel.MAX_RESENDS_PER_HOUR - this._resendCount);
  }
}
