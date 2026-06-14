import * as React from 'react';
import { Html, Body, Container, Section, Text, Preview } from '@react-email/components';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';

interface PasswordResetProps {
  username: string;
  otp: string;
}

export const PasswordReset = ({
  username = 'Operator',
  otp = '000000',
}: PasswordResetProps) => {
  return (
    <Html>
      <Preview>Security Alert: Password Reset Requested</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />
            
            <Section>
              <Text className="text-xl font-bold mb-4 text-red-500">
                Security Alert: Credentials Modification
              </Text>
              
              <Text className="text-textMuted leading-6 mb-6">
                User <strong>{username}</strong>, a request was made to reset your Aegis access credentials. 
                Use the following One-Time Password (OTP) to authorize this change.
              </Text>

              <Section className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded text-center">
                <Text className="text-3xl font-mono tracking-[0.5em] text-brand m-0">
                  {otp}
                </Text>
              </Section>
              
              <Text className="text-textMuted text-sm">
                This authorization code expires in 15 minutes. If you did not initiate this request, 
                your account may be compromised. Please contact administration immediately.
              </Text>
            </Section>

            <Footer />
          </Container>
        </Body>
      </AegisTailwind>
    </Html>
  );
};

export default PasswordReset;
