import * as React from 'react';
import { EmailLayout } from './components/email-layout';

interface PasswordResetEmailProps {
  resetLink: string;
  userEmail: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({ resetLink, userEmail }) => (
  <EmailLayout preview="Restablece tu contraseña">
    <p>Hola,</p>
    <p>
      Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada a{' '}
      <b>{userEmail}</b>.
    </p>
    <p>
      Haz clic en el siguiente enlace para establecer una nueva contraseña. Este enlace expirará en
      1 hora por seguridad.
    </p>
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
        Restablecer contraseña
      </a>
    </p>
    <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
    <p>
      Gracias,
      <br />
      El equipo de Stocka
    </p>
  </EmailLayout>
);
