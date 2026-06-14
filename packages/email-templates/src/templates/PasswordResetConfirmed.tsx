import * as React from 'react';
import { Html, Body, Container, Section, Text, Preview } from '@react-email/components';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';

interface PasswordResetConfirmedProps {
  username: string;
}

export const PasswordResetConfirmed = ({
  username = 'Operator',
}: PasswordResetConfirmedProps) => {
  return (
    <Html>
      <Preview>Notice: Password Reset Completed</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />
            
            <Section>
              <Text className="text-xl font-bold mb-4 text-brand">
                Password Reset Completed
              </Text>
              
              <Text className="text-textMuted leading-6 mb-6">
                User <strong>{username}</strong>, your password reset procedure was successfully completed.
                You can now log in with your new credentials.
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

export default PasswordResetConfirmed;
