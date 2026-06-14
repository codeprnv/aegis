import * as React from 'react';
import { Html, Body, Container, Section, Text, Preview } from '@react-email/components';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { AegisButton } from '../components/AegisButton.js';

interface WelcomeEmailProps {
  username: string;
  loginUrl?: string;
}

export const WelcomeEmail = ({
  username = 'Operator',
  loginUrl = 'https://codeprnv.org/login',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Preview>Welcome to Aegis Security, {username}.</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />
            
            <Section>
              <Text className="text-xl font-bold mb-4">
                Connection Established, {username}.
              </Text>
              
              <Text className="text-textMuted leading-6 mb-6">
                Your identity has been successfully registered in the Aegis Security network. 
                Our zero-trust architecture is now protecting your session data.
              </Text>

              <Section className="mb-6">
                <AegisButton href={loginUrl}>
                  Access Terminal
                </AegisButton>
              </Section>
            </Section>

            <Footer />
          </Container>
        </Body>
      </AegisTailwind>
    </Html>
  );
};

export default WelcomeEmail;
