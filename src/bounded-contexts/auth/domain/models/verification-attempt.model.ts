import { AggregateRoot, AggregateRootProps } from '@/shared/domain/base/aggregate-root';
import { EmailVerificationFailedEvent } from '@/auth/domain/events/email-verification-failed.event';

export interface VerificationAttemptProps extends AggregateRootProps {
  userUuid: string;
  email: string;
  ipAddress: string;
  userAgent?: string | null;
  codeEntered: string;
  success?: boolean;
  verificationType?: string;
  attemptedAt?: Date;
}

export class VerificationAttemptModel extends AggregateRoot {
  private _userUuid: string;
  private _email: string;
  private _ipAddress: string;
  private _userAgent: string | null;
  private _codeEntered: string;
  private _success: boolean;
  private _verificationType: string;
  private _attemptedAt: Date;

  private constructor(props: VerificationAttemptProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userUuid = props.userUuid;
    this._email = props.email;
    this._ipAddress = props.ipAddress;
    this._userAgent = props.userAgent ?? null;
    this._codeEntered = props.codeEntered;
    this._success = props.success ?? false;
    this._verificationType = props.verificationType ?? 'email_verification';
    this._attemptedAt = props.attemptedAt ?? new Date();
  }

  static create(props: Omit<VerificationAttemptProps, 'id'>): VerificationAttemptModel {
    return new VerificationAttemptModel(props);
  }

  static createFailed(
    props: Omit<VerificationAttemptProps, 'id' | 'success'>,
    failedAttempts: number,
  ): VerificationAttemptModel {
    const attempt = new VerificationAttemptModel({ ...props, success: false });
    attempt.apply(
      new EmailVerificationFailedEvent(
        props.userUuid,
        props.email,
        props.ipAddress,
        failedAttempts,
      ),
    );
    return attempt;
  }

  static reconstitute(
    props: VerificationAttemptProps & { id: number; uuid: string },
  ): VerificationAttemptModel {
    return new VerificationAttemptModel(props);
  }

  get userUuid(): string {
    return this._userUuid;
  }

  get email(): string {
    return this._email;
  }

  get ipAddress(): string {
    return this._ipAddress;
  }

  get userAgent(): string | null {
    return this._userAgent;
  }

  get codeEntered(): string {
    return this._codeEntered;
  }

  get success(): boolean {
    return this._success;
  }

  get verificationType(): string {
    return this._verificationType;
  }

  get attemptedAt(): Date {
    return this._attemptedAt;
  }

  markAsSuccessful(): void {
    this._success = true;
    this.touch();
  }
}
