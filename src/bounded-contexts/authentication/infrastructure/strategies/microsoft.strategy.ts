import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';
import { PopupStateStore } from '@authentication/infrastructure/helpers/popup-state-store';

interface MicrosoftProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string; type?: string }>;
  _json?: {
    mail?: string;
    userPrincipalName?: string;
  };
}

type DoneCallback = (error: Error | null, user?: SocialProfile | false) => void;

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(configService: ConfigService) {
    // `store` is a valid passport-oauth2 option (inherited by passport-microsoft)
    // but is not declared in the passport-microsoft StrategyOptions interface.
    // The cast via unknown is intentional and safe: see google.strategy.ts for rationale.
    super({
      clientID: configService.getOrThrow<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('MICROSOFT_CALLBACK_URL'),
      tenant: configService.get<string>('MICROSOFT_TENANT_ID', 'common'),
      scope: ['user.read', 'openid', 'profile', 'email'],
      store: new PopupStateStore(),
    } as unknown as ConstructorParameters<typeof Strategy>[0]);
  }

  /**
   * Invocado automáticamente por Passport para agregar parámetros personalizados
   * a la URL de autorización de Microsoft. Forzamos 'select_account' para que
   * siempre se muestre el selector de cuenta, igual que en Google.
   */
  authorizationParams(): Record<string, string> {
    return { prompt: 'select_account' };
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: MicrosoftProfile,
    done: DoneCallback,
  ): void {
    const { id, displayName } = profile;
    const email =
      profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName || '';
    const user: SocialProfile = {
      email,
      displayName: displayName || '',
      provider: 'microsoft',
      providerId: id,
    };
    done(null, user);
  }
}
