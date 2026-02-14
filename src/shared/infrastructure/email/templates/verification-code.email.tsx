import * as React from 'react';
import { Section, Text, Heading } from '@react-email/components';
import { EmailLayout } from '@shared/infrastructure/email/templates/components/email-layout';

interface VerificationCodeEmailProps {
  code: string;
  userName?: string;
  expirationMinutes?: number;
}

export const VerificationCodeEmail: React.FC<VerificationCodeEmailProps> = ({
  code,
  userName,
  expirationMinutes = 10,
}) => {
  const greeting = userName ? `Hola ${userName}` : 'Hola';

  return (
    <EmailLayout preview={`Tu código de verificación es: ${code}`}>
      <Section style={content}>
        <Heading style={heading}>{greeting},</Heading>
        <Text style={paragraph}>
          Gracias por registrarte en Stocka. Para completar tu registro, utiliza el siguiente código
          de verificación:
        </Text>
        <Section style={codeContainer}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={paragraph}>
          Este código expirará en <strong>{expirationMinutes} minutos</strong>.
        </Text>
        <Text style={paragraph}>
          Si no has solicitado este código, puedes ignorar este correo de forma segura.
        </Text>
        <Text style={signoff}>El equipo de Stocka</Text>
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
