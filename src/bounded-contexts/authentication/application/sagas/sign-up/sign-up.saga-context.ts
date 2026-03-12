import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';
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
  user?: IPersistedUserView;
  accessToken?: string;
  refreshToken?: string;
  emailSent?: boolean;
}

export interface SignUpSagaOutput {
  readonly user: IPersistedUserView;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly emailSent: boolean;
}
