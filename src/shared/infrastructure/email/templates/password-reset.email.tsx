import * as React from 'react';
import { EmailLayout } from './components/email-layout';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

interface PasswordResetEmailProps {
  resetLink: string;
  userEmail: string;
  lang?: Locale;
}

const i18n = {
  es: {
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
    signoff: 'El equipo de Stocka',
  },
  en: {
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
    signoff: 'The Stocka team',
  },
};

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  resetLink,
  userEmail,
  lang = 'es',
}) => {
  const t = i18n[lang];

  return (
    <EmailLayout preview={t.preview}>
      <p>{t.greeting}</p>
      <p>{t.body(userEmail)}</p>
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
        {t.signoff}
      </p>
    </EmailLayout>
  );
};
