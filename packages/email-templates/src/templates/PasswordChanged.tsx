import * as React from 'react';
import { Html, Body, Container, Section, Text, Preview } from '@react-email/components';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';

interface PasswordChangedProps {
  username: string;
}

export const PasswordChanged = ({
  username = 'Operator',
}: PasswordChangedProps) => {
  return (
    <Html>
      <Preview>Notice: Credentials Successfully Modified</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />
            
            <Section>
              <Text className="text-xl font-bold mb-4 text-brand">
                Credentials Modification Confirmed
              </Text>
              
              <Text className="text-textMuted leading-6 mb-6">
                User <strong>{username}</strong>, your Aegis access credentials have been successfully updated.
                All active sessions using the old credentials have been terminated per zero-trust protocols.
              </Text>
              
              <Text className="text-textMuted text-sm text-red-400">
                If you did not make this change, please contact system administration immediately.
              </Text>
            </Section>

            <Footer />
          </Container>
        </Body>
      </AegisTailwind>
    </Html>
  );
};

export default PasswordChanged;
