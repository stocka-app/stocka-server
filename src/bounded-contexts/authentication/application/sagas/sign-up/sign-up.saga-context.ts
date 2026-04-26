import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export interface SignUpSagaContext {
  // Input — set before saga.execute()
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly lang: Locale;

  // Computed by steps during execution
  passwordHash?: string;
  verificationCode?: string;
  user?: UserAggregate;
  credential?: CredentialAccountModel;
  accountId?: number;
  accessToken?: string;
  refreshToken?: string;
  emailSent?: boolean;
}

export interface SignUpSagaOutput {
  readonly user: UserAggregate;
  readonly credential: CredentialAccountModel;
  readonly username: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly emailSent: boolean;
}
