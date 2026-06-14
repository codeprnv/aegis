import {
  Body,
  Container,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';

interface AdminPasswordResetProps {
  username: string;
  temporaryPassword: string;
}

export const AdminPasswordReset = ({
  username = 'Operator',
  temporaryPassword = 'temporary_password',
}: AdminPasswordResetProps) => {
  return (
    <Html>
      <Preview>Administrator Action: Temporary Credentials Issued</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-xl font-bold mb-4 text-brand">
                Administrator Action: Temporary Credentials Issued
              </Text>

              <Text className="text-textMuted leading-6 mb-6">
                User <strong>{username}</strong>, your access credentials have
                been reset by a system administrator. Please use the following
                temporary password to access the terminal.
                <br />
                <br />
                <strong>
                  You will be required to change your password immediately upon
                  login.
                </strong>
              </Text>

              <Section className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded text-center">
                <Text className="text-2xl font-mono tracking-wider text-brand m-0">
                  {temporaryPassword}
                </Text>
              </Section>
            </Section>

            <Footer />
          </Container>
        </Body>
      </AegisTailwind>
    </Html>
  );
};

export default AdminPasswordReset;
