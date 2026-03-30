import * as React from 'react';
import { EmailLayout } from '@shared/infrastructure/email/templates/components/email-layout';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

interface PasswordResetEmailProps {
  resetLink: string;
  userEmail: string;
  lang?: Locale;
  isSocialAccount?: boolean;
  provider?: string | null;
}

const formatProvider = (provider: string | null | undefined): string => {
  if (!provider) return '';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

const i18n = {
  es: {
    manual: {
      preview: 'Restablece tu contraseña',
      greeting: 'Hola,',
      body: (email: string) => (
        <>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada a{' '}
          <b>{email}</b>.
        </>
      ),
      instruction:
        'Haz clic en el siguiente enlace para establecer una nueva contraseña. Este enlace expirará en 1 hora por seguridad.',
      cta: 'Restablecer contraseña',
      ignore: 'Si no solicitaste este cambio, puedes ignorar este correo.',
    },
    social: {
      preview: 'Establece una contraseña para tu cuenta',
      greeting: 'Hola,',
      body: (provider: string) => (
        <>
          Normalmente inicias sesión con <b>{provider}</b>. Si lo deseas, puedes establecer una
          contraseña para también acceder con tu correo y contraseña.
        </>
      ),
      instruction:
        'Haz clic en el siguiente enlace para establecer tu contraseña. Este enlace expirará en 1 hora por seguridad.',
      cta: 'Establecer contraseña',
      ignore: 'Si no solicitaste este cambio, puedes ignorar este correo.',
    },
    signoff: 'El equipo de Stocka',
  },
  en: {
    manual: {
      preview: 'Reset your password',
      greeting: 'Hello,',
      body: (email: string) => (
        <>
          We received a request to reset the password for your account associated with{' '}
          <b>{email}</b>.
        </>
      ),
      instruction:
        'Click the link below to set a new password. This link will expire in 1 hour for security reasons.',
      cta: 'Reset password',
      ignore: 'If you did not request this change, you can safely ignore this email.',
    },
    social: {
      preview: 'Set a password for your account',
      greeting: 'Hello,',
      body: (provider: string) => (
        <>
          You normally sign in with <b>{provider}</b>. If you&apos;d like, you can set a password to
          also access your account with your email and password.
        </>
      ),
      instruction:
        'Click the link below to set your password. This link will expire in 1 hour for security reasons.',
      cta: 'Set password',
      ignore: 'If you did not request this change, you can safely ignore this email.',
    },
    signoff: 'The Stocka team',
  },
};

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  resetLink,
  userEmail,
  lang = 'es',
  isSocialAccount = false,
  provider = null,
}) => {
  const locale = i18n[lang];
  const t = isSocialAccount ? locale.social : locale.manual;
  const providerName = formatProvider(provider);

  return (
    <EmailLayout preview={t.preview}>
      <p>{t.greeting}</p>
      <p>
        {isSocialAccount
          ? (locale.social.body as (provider: string) => React.ReactNode)(providerName)
          : (locale.manual.body as (email: string) => React.ReactNode)(userEmail)}
      </p>
      <p>{t.instruction}</p>
      <p>
        <a
          href={resetLink}
          style={{
            background: '#2563eb',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'inline-block',
            fontWeight: 600,
          }}
        >
          {t.cta}
        </a>
      </p>
      <p>{t.ignore}</p>
      <p>
        Gracias,
        <br />
        {locale.signoff}
      </p>
    </EmailLayout>
  );
};
