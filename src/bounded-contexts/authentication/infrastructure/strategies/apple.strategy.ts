import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '@arendajaelu/nestjs-passport-apple';
import { ConfigService } from '@nestjs/config';
import { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';

interface AppleProfile {
  id: string;
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID', 'disabled'),
      teamID: configService.get<string>('APPLE_TEAM_ID', 'disabled'),
      keyID: configService.get<string>('APPLE_KEY_ID', 'disabled'),
      key: configService.get<string>('APPLE_PRIVATE_KEY', 'disabled'),
      callbackURL: configService.get<string>(
        'APPLE_CALLBACK_URL',
        'http://localhost:3001/api/authentication/apple/callback',
      ),
      scope: ['email', 'name'],
      passReqToCallback: false,
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: AppleProfile,
    done: (error: Error | null, user?: SocialProfile) => void,
  ): void {
    const displayName =
      profile.name?.firstName && profile.name?.lastName
        ? `${profile.name.firstName} ${profile.name.lastName}`
        : profile.email?.split('@')[0] || 'Apple User';
    const user: SocialProfile = {
      email: profile.email || '',
      displayName,
      provider: 'apple',
      providerId: profile.id,
    };
    done(null, user);
  }
}
