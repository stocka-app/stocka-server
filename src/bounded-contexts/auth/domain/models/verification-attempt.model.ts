import { AggregateRoot, AggregateRootProps } from '@/shared/domain/base/aggregate-root';
import { UuidVO } from '@/shared/domain/value-objects/compound/uuid.vo';
import { VerificationCodeVO } from '@/shared/domain/value-objects/compound/verification-code.vo';
import { EmailVO } from '@/shared/domain/value-objects/compound/email.vo';
import { IpAddressVO } from '@/auth/domain/value-objects/ip-address.vo';
import { UserAgentVO } from '@/auth/domain/value-objects/user-agent.vo';
import { VerificationTypeVO } from '@/auth/domain/value-objects/verification-type.vo';
import { VerificationResultVO } from '@/auth/domain/value-objects/verification-result.vo';
import { AttemptedAtVO } from '@/auth/domain/value-objects/attempted-at.vo';
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
  private readonly _userUuid: UuidVO;
  private readonly _email: EmailVO;
  private readonly _ipAddress: IpAddressVO;
  private readonly _userAgent: UserAgentVO | null;
  private readonly _codeEntered: VerificationCodeVO;
  private _result: VerificationResultVO;
  private readonly _verificationType: VerificationTypeVO;
  private readonly _attemptedAt: AttemptedAtVO;

  private constructor(props: VerificationAttemptProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._userUuid = new UuidVO(props.userUuid);
    this._email = new EmailVO(props.email);
    this._ipAddress = IpAddressVO.create(props.ipAddress);
    this._userAgent = props.userAgent ? new UserAgentVO(props.userAgent) : null;
    this._codeEntered = new VerificationCodeVO(props.codeEntered);
    this._result = VerificationResultVO.fromBoolean(props.success ?? false);
    this._verificationType = new VerificationTypeVO(props.verificationType ?? 'email_verification');
    this._attemptedAt = props.attemptedAt
      ? new AttemptedAtVO(props.attemptedAt)
      : AttemptedAtVO.now();
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

  get userUuid(): UuidVO {
    return this._userUuid;
  }

  get email(): EmailVO {
    return this._email;
  }

  get ipAddress(): IpAddressVO {
    return this._ipAddress;
  }

  get userAgent(): UserAgentVO | null {
    return this._userAgent;
  }

  get codeEntered(): VerificationCodeVO {
    return this._codeEntered;
  }

  get result(): VerificationResultVO {
    return this._result;
  }

  get verificationType(): VerificationTypeVO {
    return this._verificationType;
  }

  get attemptedAt(): AttemptedAtVO {
    return this._attemptedAt;
  }

  markAsSuccessful(): void {
    this._result = VerificationResultVO.success();
    this.touch();
  }
}
