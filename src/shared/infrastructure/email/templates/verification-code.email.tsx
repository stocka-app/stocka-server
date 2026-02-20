import * as React from 'react';
import { Section, Text, Heading } from '@react-email/components';
import { EmailLayout } from '@shared/infrastructure/email/templates/components/email-layout';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

interface VerificationCodeEmailProps {
  code: string;
  userName?: string;
  expirationMinutes?: number;
  lang?: Locale;
}

const i18n = {
  es: {
    preview: (code: string) => `Tu código de verificación es: ${code}`,
    greeting: (name?: string) => (name ? `Hola ${name}` : 'Hola'),
    body: 'Gracias por registrarte en Stocka. Para completar tu registro, utiliza el siguiente código de verificación:',
    expiry: (mins: number) => (
      <>
        Este código expirará en <strong>{mins} minutos</strong>.
      </>
    ),
    ignore: 'Si no has solicitado este código, puedes ignorar este correo de forma segura.',
    signoff: 'El equipo de Stocka',
  },
  en: {
    preview: (code: string) => `Your verification code is: ${code}`,
    greeting: (name?: string) => (name ? `Hello ${name}` : 'Hello'),
    body: 'Thank you for signing up to Stocka. To complete your registration, use the following verification code:',
    expiry: (mins: number) => (
      <>
        This code expires in <strong>{mins} minutes</strong>.
      </>
    ),
    ignore: 'If you did not request this code, you can safely ignore this email.',
    signoff: 'The Stocka team',
  },
};

export const VerificationCodeEmail: React.FC<VerificationCodeEmailProps> = ({
  code,
  userName,
  expirationMinutes = 10,
  lang = 'es',
}) => {
  const t = i18n[lang];

  return (
    <EmailLayout preview={t.preview(code)}>
      <Section style={content}>
        <Heading style={heading}>{t.greeting(userName)},</Heading>
        <Text style={paragraph}>{t.body}</Text>
        <Section style={codeContainer}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={paragraph}>{t.expiry(expirationMinutes)}</Text>
        <Text style={paragraph}>{t.ignore}</Text>
        <Text style={signoff}>{t.signoff}</Text>
      </Section>
    </EmailLayout>
  );
};

const content = {
  padding: '32px 48px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#525f7f',
  margin: '0 0 16px',
};

const codeContainer = {
  background: '#f4f4f5',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const codeText = {
  fontSize: '36px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#1a1a1a',
  margin: '0',
  fontFamily: 'monospace',
};

const signoff = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#525f7f',
  margin: '32px 0 0',
};

export default VerificationCodeEmail;
