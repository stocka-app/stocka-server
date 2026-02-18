import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface SocialProfile {
  email: string;
  displayName: string;
  provider: string;
  providerId: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  /**
   * Este método es invocado automáticamente por Passport (passport-google-oauth20)
   * para agregar parámetros personalizados a la URL de autorización de Google.
   * No se llama manualmente. Aquí forzamos el parámetro 'prompt' para que
   * siempre se muestre el selector de cuenta de Google al iniciar sesión.
   */
  authorizationParams(): Record<string, string> {
    return { prompt: 'select_account' };
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, emails, displayName } = profile;

    const user: SocialProfile = {
      email: emails?.[0]?.value || '',
      displayName: displayName || '',
      provider: 'google',
      providerId: id,
    };

    done(null, user);
  }
}
