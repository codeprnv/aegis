import {
  Body,
  Container,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { AegisButton } from '../components/AegisButton.js';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';

/**
 * Properties for the AccountAlreadyExists email template.
 */
export interface AccountAlreadyExistsProps {
  /** Recipient email address. */
  email?: string;
  /** Destination URL to sign into the existing account. */
  loginUrl?: string;
  /** Destination URL to initiate a secure password reset. */
  resetUrl?: string;
  /** Direct support/security contact email. */
  supportEmail?: string;
}

/**
 * Security notification dispatched when a registration attempt occurs with an email
 * address that is already registered in Aegis. Preserves zero-enumeration security
 * by notifying the real owner without confirming account existence to the untrusted caller.
 */
export const AccountAlreadyExists: React.FC<AccountAlreadyExistsProps> = ({
  email,
  loginUrl = 'http://localhost:3000/login',
  resetUrl = 'http://localhost:3000/forgot-password',
  supportEmail = 'security@codeprnv.org',
}) => {
  return (
    <Html>
      <Preview>Registration attempt on your Aegis account</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-2xl font-bold mb-2 text-white">
                Account Registration Attempt
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Someone recently attempted to create a new Aegis account using
                your email address
                {email ? (
                  <>
                    {' '}
                    (<strong>{email}</strong>)
                  </>
                ) : null}
                .
              </Text>

              {/* Status Card */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <Text className="text-sm font-semibold text-white m-0">
                  🛡️ Your Account Remains Secure
                </Text>
                <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-2">
                  Since you already have an active Aegis identity, no new
                  account was created and your existing credentials,
                  permissions, and security settings were unaffected.
                </Text>
              </Section>

              {/* Action Buttons */}
              <Section className="mb-6">
                <Text className="text-sm text-zinc-300 mb-3">
                  If this was you, you can log in directly or reset your
                  password if you forgot it:
                </Text>
                <div className="mb-4">
                  <AegisButton href={loginUrl}>Sign In to Aegis</AegisButton>
                </div>
                <Text className="text-xs text-zinc-400 mt-3">
                  Need to reset your credentials?{' '}
                  <a href={resetUrl} className="text-brand underline">
                    Reset your password here
                  </a>
                </Text>
              </Section>

              {/* Escalation Box */}
              <Section className="p-4 bg-zinc-900/60 border border-zinc-700/50 rounded-xl">
                <Text className="text-xs font-bold uppercase tracking-wider text-zinc-300 m-0 mb-1 font-mono">
                  Didn't attempt this registration?
                </Text>
                <Text className="text-xs text-zinc-400 leading-relaxed m-0">
                  You can safely ignore this email. No access was granted, and
                  no changes were made to your account. If you suspect malicious
                  activity, please contact our security team at{' '}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-brand underline"
                  >
                    {supportEmail}
                  </a>
                  .
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

export default AccountAlreadyExists;
