import * as React from 'react';
import { Body, Container, Head, Html, Img, Preview, Section, Text, Hr } from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({ preview, children }) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <table cellPadding="0" cellSpacing="0" role="presentation">
              <tr>
                <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                  <Img
                    src="https://stocka.app/stocka-icon.png"
                    width="32"
                    height="32"
                    alt="Stocka"
                    style={{ borderRadius: '7px' }}
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={logo}>Stocka</Text>
                </td>
              </tr>
            </table>
          </Section>
          {children}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Stocka. Todos los derechos reservados.
            </Text>
            <Text style={footerText}>
              Este correo fue enviado automáticamente. Por favor no responda a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 48px',
  borderBottom: '1px solid #e6ebf1',
};

const logo = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 48px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#8898aa',
  margin: '0',
  marginTop: '8px',
};

export default EmailLayout;
