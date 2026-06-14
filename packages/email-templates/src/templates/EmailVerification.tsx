import * as React from 'react';
import { Html, Body, Container, Section, Text, Preview } from '@react-email/components';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { AegisButton } from '../components/AegisButton.js';

interface EmailVerificationProps {
  username: string;
  verificationToken: string;
  verificationUrl?: string;
}

export const EmailVerification = ({
  username = 'Operator',
  verificationToken = 'xxx-yyy-zzz',
  verificationUrl = `https://codeprnv.org/verify?token=xxx-yyy-zzz`,
}: EmailVerificationProps) => {
  return (
    <Html>
      <Preview>Verify your identity for Aegis Security.</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />
            
            <Section>
              <Text className="text-xl font-bold mb-4">
                Identity Verification Required.
              </Text>
              
              <Text className="text-textMuted leading-6 mb-6">
                Terminal access requested for user <strong>{username}</strong>. 
                Please verify this email address to activate your account and establish trust.
              </Text>

              <Section className="mb-6">
                <AegisButton href={verificationUrl}>
                  Verify Identity
                </AegisButton>
              </Section>
              
              <Text className="text-textMuted text-sm">
                Or manually enter this token: <code className="bg-zinc-800 px-2 py-1 rounded text-brand">{verificationToken}</code>
              </Text>
            </Section>

            <Footer />
          </Container>
        </Body>
      </AegisTailwind>
    </Html>
  );
};

export default EmailVerification;
