import {
  Body,
  Container,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { AegisButton } from '../components/AegisButton.js';
import { AegisTailwind } from '../components/AegisTailwind.js';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';

/**
 * Properties for the EmailVerification template.
 */
interface EmailVerificationProps {
  /** Recipient username or display identifier. */
  username: string;
  /** Cryptographic alphanumeric verification token for manual entry. */
  verificationToken: string;
  /** Fully qualified browser link to the verification endpoint. */
  verificationUrl?: string;
}

/**
 * Transactional email dispatched during user registration or resend verification workflows.
 * Instructs the user to confirm their email address within the 24-hour staging window.
 */
export const EmailVerification = ({
  username = 'Operator',
  verificationToken = 'xxx-yyy-zzz',
  verificationUrl = `http://localhost:3000/verify-email?token=xxx-yyy-zzz`,
}: EmailVerificationProps) => {
  return (
    <Html>
      <Preview>Verify your email address to activate your Aegis account.</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-xl font-bold mb-3 text-white">
                Verify Your Email Address
              </Text>

              <Text className="text-zinc-300 leading-6 mb-4 text-sm">
                Hi <strong>{username}</strong>, thanks for creating an account with Aegis!
                Please verify your email address to activate your account and access your
                security dashboard.
              </Text>

              <Section className="mb-5 p-4 bg-amber-950/30 border border-amber-800/40 rounded-lg">
                <Text className="text-xs text-amber-200 leading-5 m-0">
                  <strong className="text-amber-300">Action Required within 24 Hours:</strong> This verification
                  link will expire in <strong>24 hours</strong>. If your account is not verified within this timeframe,
                  your pending registration will be automatically deleted for security purposes, and you will have to register again.
                </Text>
              </Section>

              <Section className="mb-4">
                <AegisButton href={verificationUrl}>
                  Verify Account
                </AegisButton>
              </Section>

              <Section className="my-6">
                <Hr className="border-zinc-800 my-4" />
                <Text className="text-zinc-500 text-xs uppercase font-mono text-center m-0">
                  ── or enter token manually ──
                </Text>
              </Section>

              <Section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <Text className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold m-0 mb-2">
                  🔑 Verification Token
                </Text>

                <div
                  className="p-3 bg-black border border-zinc-700 rounded font-mono text-sm text-brand select-all"
                  style={{ userSelect: 'all', WebkitUserSelect: 'all' }}
                >
                  {verificationToken}
                </div>

                <Text className="text-zinc-400 text-xs mt-2 m-0 leading-relaxed">
                  Single-click or tap to select the entire token. If you are on the verification screen,
                  paste this token to verify your account manually.
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

export default EmailVerification;

