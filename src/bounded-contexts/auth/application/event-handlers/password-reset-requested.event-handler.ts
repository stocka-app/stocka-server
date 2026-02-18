import * as React from 'react';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetRequestedEvent } from '@auth/domain/events/password-reset-requested.event';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { render } from '@react-email/render';
import { PasswordResetEmail } from '@shared/infrastructure/email/templates/password-reset.email';

@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedEventHandler implements IEventHandler<PasswordResetRequestedEvent> {
  private readonly logger = new Logger(PasswordResetRequestedEventHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(`Password reset requested: userId=${event.userId}`);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${event.token}`;

    // Renderizar el template de email
    const html = await render(
      React.createElement(
        PasswordResetEmail,
        {
          resetLink,
          userEmail: event.email,
        },
        null,
      ),
    );

    await this.emailProvider.sendEmail({
      to: event.email,
      subject: 'Restablece tu contraseña en Stocka',
      html,
    });
  }
}
