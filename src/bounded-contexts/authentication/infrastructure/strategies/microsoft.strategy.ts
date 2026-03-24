import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';
import { PopupStateStore } from '@authentication/infrastructure/helpers/popup-state-store';

const GRAPH_PHOTO_URL = 'https://graph.microsoft.com/v1.0/me/photos/96x96/$value';

interface MicrosoftProfile {
  id: string;
  displayName: string;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ value: string; type?: string }>;
  _json?: {
    mail?: string;
    userPrincipalName?: string;
    givenName?: string;
    surname?: string;
    preferredLanguage?: string;
    jobTitle?: string;
    [key: string]: unknown;
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

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: MicrosoftProfile,
    done: DoneCallback,
  ): Promise<void> {
    const { id, displayName } = profile;
    const email =
      profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName || '';
    const json = (profile._json as Record<string, unknown>) ?? {};

    const avatarUrl = await this.fetchProfilePhoto(accessToken);

    const user: SocialProfile = {
      email,
      displayName: displayName || '',
      provider: 'microsoft',
      providerId: id,
      givenName: profile._json?.givenName ?? null,
      familyName: profile._json?.surname ?? null,
      avatarUrl,
      locale: profile._json?.preferredLanguage ?? null,
      emailVerified: true,
      jobTitle: profile._json?.jobTitle ?? null,
      rawData: json,
    };
    done(null, user);
  }

  /**
   * Fetches the user's profile photo from Microsoft Graph API and converts it
   * to a base64 data URI. Returns null when the user has no photo set (404)
   * or when the Graph API call fails for any reason.
   *
   * Microsoft does not provide a public photo URL in the OAuth profile — the
   * photo endpoint requires a Bearer token and returns raw image bytes.
   */
  private async fetchProfilePhoto(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(GRAPH_PHOTO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      return null;
    }
  }
}
