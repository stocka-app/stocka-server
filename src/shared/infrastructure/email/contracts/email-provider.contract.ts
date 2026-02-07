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
  sendVerificationEmail(to: string, code: string, userName?: string): Promise<SendEmailResult>;
  sendWelcomeEmail(to: string, userName: string): Promise<SendEmailResult>;
}
