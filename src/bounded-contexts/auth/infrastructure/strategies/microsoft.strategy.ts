import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { SocialProfile } from '@/auth/infrastructure/strategies/google.strategy';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('MICROSOFT_CALLBACK_URL'),
      tenant: configService.get<string>('MICROSOFT_TENANT_ID', 'common'),
      scope: ['user.read', 'openid', 'profile', 'email'],
    });
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
      provider: 'microsoft',
      providerId: id,
    };

    done(null, user);
  }
}
