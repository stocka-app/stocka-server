import * as React from 'react';
import { Section, Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from '@shared/infrastructure/email/templates/components/email-layout';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

interface WelcomeEmailProps {
  userName: string;
  loginUrl?: string;
  lang?: Locale;
}

const i18n = {
  es: {
    preview: '¡Bienvenido a Stocka! Tu cuenta ha sido verificada.',
    heading: (name: string) => `¡Bienvenido a Stocka, ${name}!`,
    verified: 'Tu cuenta ha sido verificada exitosamente. Ahora puedes acceder a todas las funcionalidades de Stocka.',
    features: 'Con Stocka podrás:',
    featureList: [
      'Gestionar tu inventario de forma eficiente',
      'Controlar tus productos y stock en tiempo real',
      'Generar reportes y análisis de tu negocio',
    ],
    cta: 'Iniciar Sesión',
    help: 'Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.',
    signoff: 'El equipo de Stocka',
  },
  en: {
    preview: 'Welcome to Stocka! Your account has been verified.',
    heading: (name: string) => `Welcome to Stocka, ${name}!`,
    verified: 'Your account has been successfully verified. You can now access all Stocka features.',
    features: 'With Stocka you can:',
    featureList: [
      'Manage your inventory efficiently',
      'Track your products and stock in real time',
      'Generate reports and business analytics',
    ],
    cta: 'Sign In',
    help: 'If you have any questions, feel free to contact us. We are here to help.',
    signoff: 'The Stocka team',
  },
};

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  loginUrl = 'https://stocka.app/login',
  lang = 'es',
}) => {
  const t = i18n[lang];

  return (
    <EmailLayout preview={t.preview}>
      <Section style={content}>
        <Heading style={heading}>{t.heading(userName)}</Heading>
        <Text style={paragraph}>{t.verified}</Text>
        <Text style={paragraph}>{t.features}</Text>
        <ul style={list}>
          {t.featureList.map((item, idx) => (
            <li key={idx} style={listItem}>
              {item}
            </li>
          ))}
        </ul>
        <Section style={buttonContainer}>
          <Button style={button} href={loginUrl}>
            {t.cta}
          </Button>
        </Section>
        <Text style={paragraph}>{t.help}</Text>
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

const list = {
  margin: '16px 0',
  padding: '0 0 0 24px',
};

const listItem = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#525f7f',
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#1a1a1a',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const signoff = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#525f7f',
  margin: '32px 0 0',
};

export default WelcomeEmail;
