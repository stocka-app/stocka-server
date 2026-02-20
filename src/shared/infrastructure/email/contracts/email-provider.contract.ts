import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface IEmailProviderContract {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  sendVerificationEmail(
    to: string,
    code: string,
    userName?: string,
    lang?: Locale,
  ): Promise<SendEmailResult>;
  sendWelcomeEmail(to: string, userName: string, lang?: Locale): Promise<SendEmailResult>;
  sendPasswordResetEmail(
    to: string,
    resetLink: string,
    userEmail: string,
    lang?: Locale,
  ): Promise<SendEmailResult>;
}
