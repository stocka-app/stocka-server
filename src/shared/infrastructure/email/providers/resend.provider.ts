import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import {
  IEmailProviderContract,
  SendEmailOptions,
  SendEmailResult,
} from '@shared/infrastructure/email/contracts/email-provider.contract';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';
import { VerificationCodeEmail } from '@shared/infrastructure/email/templates/verification-code.email';
import { WelcomeEmail } from '@shared/infrastructure/email/templates/welcome.email';
import { PasswordResetEmail } from '@shared/infrastructure/email/templates/password-reset.email';

@Injectable()
export class ResendEmailProvider implements IEmailProviderContract {
  private readonly resend: Resend;
  private readonly defaultFrom: string;
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') || 'Stocka <noreply@stocka.app>';
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        tags: options.tags,
      });

      if (error) {
        this.logger.error(`Failed to send email: ${error.message}`, error);
        return {
          id: '',
          success: false,
          error: error.message,
        };
      }

      this.logger.log(`Email sent successfully. ID: ${data?.id}`);
      return {
        id: data?.id || '',
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email: ${errorMessage}`, error);
      return {
        id: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendVerificationEmail(
    to: string,
    code: string,
    userName?: string,
    lang: Locale = 'es',
  ): Promise<SendEmailResult> {
    const expirationMinutes = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRATION_MINUTES',
      10,
    );

    const subject =
      lang === 'en'
        ? `${code} is your Stocka verification code`
        : `${code} es tu código de verificación de Stocka`;

    const html = await render(
      React.createElement(VerificationCodeEmail, {
        code,
        userName,
        expirationMinutes,
        lang,
      }),
    );

    return this.sendEmail({
      to,
      subject,
      html,
      tags: [
        { name: 'category', value: 'verification' },
        { name: 'type', value: 'email_verification' },
      ],
    });
  }

  async sendWelcomeEmail(
    to: string,
    userName: string,
    lang: Locale = 'es',
  ): Promise<SendEmailResult> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://stocka.app');
    const loginUrl = `${frontendUrl}/login`;

    const subject = lang === 'en' ? 'Welcome to Stocka!' : '¡Bienvenido a Stocka!';

    const html = await render(
      React.createElement(WelcomeEmail, {
        userName,
        loginUrl,
        lang,
      }),
    );

    return this.sendEmail({
      to,
      subject,
      html,
      tags: [
        { name: 'category', value: 'transactional' },
        { name: 'type', value: 'welcome' },
      ],
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    userEmail: string,
    lang: Locale = 'es',
    isSocialAccount: boolean = false,
    provider: string | null = null,
  ): Promise<SendEmailResult> {
    const subject = isSocialAccount
      ? lang === 'en'
        ? 'Set a password for your Stocka account'
        : 'Establece una contraseña para tu cuenta de Stocka'
      : lang === 'en'
        ? 'Reset your Stocka password'
        : 'Restablece tu contraseña de Stocka';

    const html = await render(
      React.createElement(PasswordResetEmail, {
        resetLink,
        userEmail,
        lang,
        isSocialAccount,
        provider,
      }),
    );

    return this.sendEmail({
      to,
      subject,
      html,
      tags: [
        { name: 'category', value: 'transactional' },
        { name: 'type', value: 'password_reset' },
      ],
    });
  }
}
