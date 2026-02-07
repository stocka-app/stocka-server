import * as React from 'react';
import { Section, Text, Heading, Button } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface WelcomeEmailProps {
  userName: string;
  loginUrl?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  loginUrl = 'https://stocka.app/login',
}) => {
  return (
    <EmailLayout preview="¡Bienvenido a Stocka! Tu cuenta ha sido verificada.">
      <Section style={content}>
        <Heading style={heading}>¡Bienvenido a Stocka, {userName}!</Heading>
        <Text style={paragraph}>
          Tu cuenta ha sido verificada exitosamente. Ahora puedes acceder a todas las
          funcionalidades de Stocka.
        </Text>
        <Text style={paragraph}>Con Stocka podrás:</Text>
        <ul style={list}>
          <li style={listItem}>Gestionar tu inventario de forma eficiente</li>
          <li style={listItem}>Controlar tus productos y stock en tiempo real</li>
          <li style={listItem}>Generar reportes y análisis de tu negocio</li>
        </ul>
        <Section style={buttonContainer}>
          <Button style={button} href={loginUrl}>
            Iniciar Sesión
          </Button>
        </Section>
        <Text style={paragraph}>
          Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.
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
