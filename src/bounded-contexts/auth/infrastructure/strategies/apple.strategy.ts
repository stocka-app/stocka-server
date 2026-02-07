import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '@arendajaelu/nestjs-passport-apple';
import { ConfigService } from '@nestjs/config';
import { SocialProfile } from '@/auth/infrastructure/strategies/google.strategy';

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
      clientID: configService.getOrThrow<string>('APPLE_CLIENT_ID'),
      teamID: configService.getOrThrow<string>('APPLE_TEAM_ID'),
      keyID: configService.getOrThrow<string>('APPLE_KEY_ID'),
      key: configService.getOrThrow<string>('APPLE_PRIVATE_KEY'),
      callbackURL: configService.getOrThrow<string>('APPLE_CALLBACK_URL'),
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
