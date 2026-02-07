import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { SocialProfile } from '@/auth/infrastructure/strategies/google.strategy';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.getOrThrow<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.getOrThrow<string>('FACEBOOK_CALLBACK_URL'),
      scope: ['email'],
      profileFields: ['emails', 'name', 'displayName'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: SocialProfile) => void,
  ): void {
    const { id, emails, displayName, name } = profile;

    const user: SocialProfile = {
      email: emails?.[0]?.value || '',
      displayName: displayName || `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      provider: 'facebook',
      providerId: id,
    };

    done(null, user);
  }
}
