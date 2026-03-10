import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { CodeHashVO } from '@shared/domain/value-objects/primitive/code-hash.vo';
import { ExpiresAtVO } from '@shared/domain/value-objects/compound/expires-at.vo';
import { UsedAtVO } from '@auth/domain/value-objects/used-at.vo';
import { ResendCountVO } from '@auth/domain/value-objects/resend-count.vo';
import { EmailVerificationRequestedEvent } from '@auth/domain/events/email-verification-requested.event';
import { EmailVerificationCompletedEvent } from '@auth/domain/events/email-verification-completed.event';
import { VerificationCodeResentEvent } from '@auth/domain/events/verification-code-resent.event';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

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
  private readonly _userId: number;
  private _codeHash: CodeHashVO;
  private _expiresAt: ExpiresAtVO;
  private _usedAt: UsedAtVO | null;
  private _resendCount: ResendCountVO;
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
    this._codeHash = new CodeHashVO(props.codeHash);
    this._expiresAt = new ExpiresAtVO(props.expiresAt);
    this._usedAt = props.usedAt ? new UsedAtVO(props.usedAt) : null;
    this._resendCount = new ResendCountVO(props.resendCount ?? 0);
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

  /**
   * Factory para el caso de reenvío cuando no existe token previo.
   * Emite VerificationCodeResentEvent (no EmailVerificationRequestedEvent)
   * para que el event handler de reenvío sea el único responsable del correo.
   */
  static createForResend(
    props: Omit<EmailVerificationTokenProps, 'id'> & { email: string; code: string; lang?: Locale },
  ): EmailVerificationTokenModel {
    const token = new EmailVerificationTokenModel({
      ...props,
      resendCount: 1,
      lastResentAt: new Date(),
    });

    token.apply(
      new VerificationCodeResentEvent(token.userId, props.email, props.code, 1, props.lang ?? 'es'),
    );

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
    return this._codeHash.getValue();
  }

  get expiresAt(): Date {
    return this._expiresAt.toDate();
  }

  get usedAt(): Date | null {
    return this._usedAt?.toDate() ?? null;
  }

  get resendCount(): number {
    return this._resendCount.getValue();
  }

  get lastResentAt(): Date | null {
    return this._lastResentAt;
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

  markAsUsed(userUUID: string, email: string, lang: Locale = 'es'): void {
    this._usedAt = UsedAtVO.now();
    this.touch();
    this.apply(new EmailVerificationCompletedEvent(userUUID, email, lang));
  }

  canResend(): boolean {
    if (this._resendCount.getValue() >= EmailVerificationTokenModel.MAX_RESENDS_PER_HOUR) {
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
      this._resendCount.getValue(),
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

  updateCode(
    newCodeHash: string,
    newExpiresAt: Date,
    email: string,
    code: string,
    lang: Locale = 'es',
  ): void {
    this._codeHash = new CodeHashVO(newCodeHash);
    this._expiresAt = new ExpiresAtVO(newExpiresAt);
    this._resendCount = this._resendCount.increment();
    this._lastResentAt = new Date();
    this.touch();
    this.apply(
      new VerificationCodeResentEvent(this.userId, email, code, this._resendCount.getValue(), lang),
    );
  }

  getMaxResendsPerHour(): number {
    return EmailVerificationTokenModel.MAX_RESENDS_PER_HOUR;
  }

  getRemainingResends(): number {
    return Math.max(
      0,
      EmailVerificationTokenModel.MAX_RESENDS_PER_HOUR - this._resendCount.getValue(),
    );
  }
}
