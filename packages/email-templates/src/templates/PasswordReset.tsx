import {
  Body,
  Container,
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
 * Properties for the PasswordReset template.
 */
interface PasswordResetProps {
  /** Recipient username or display identifier. */
  username: string;
  /** 6-digit one-time password code. */
  otp: string;
  /** Fully qualified browser URL to the forgot-password endpoint. */
  resetUrl?: string;
}

/**
 * Transactional email dispatched when a user requests a password reset.
 * Delivers the 6-digit OTP, details the 10-minute expiry and 1-hour cooldown limits,
 * and provides a direct CTA to proceed with credential rotation.
 */
export const PasswordReset = ({
  username = 'Operator',
  otp = '000000',
  resetUrl = 'http://localhost:3000/forgot-password',
}: PasswordResetProps) => {
  return (
    <Html>
      <Preview>Your Aegis Password Reset Verification Code</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-2xl font-bold mb-2 text-white">
                Reset Your Password
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Hi <strong>{username}</strong>, we received a request to reset the password
                for your Aegis account. Use the 6-digit verification code below to proceed.
              </Text>

              {/* Hero OTP Code Card */}
              <Section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 shadow-inner">
                <Text className="text-xs font-mono uppercase tracking-widest text-brand font-semibold m-0 mb-2">
                  🔑 Verification Code
                </Text>

                <div
                  className="my-3 p-4 bg-black border border-zinc-700 rounded-lg text-center select-all"
                  style={{ userSelect: 'all', WebkitUserSelect: 'all' }}
                >
                  <span className="text-3xl font-mono tracking-[0.4em] text-brand font-bold select-all">
                    {otp}
                  </span>
                </div>

                <Text className="text-zinc-500 text-xs text-center m-0">
                  Single-click or tap on the code to highlight all digits.
                </Text>
              </Section>

              {/* Polite Urgency & Cooldown Info Block */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <Text className="text-xs font-mono uppercase tracking-wider text-brand font-bold m-0 mb-2.5">
                  ⏱️ Important Time & Cooldown Limits
                </Text>
                <Text className="text-zinc-300 text-xs leading-5 m-0 mb-2">
                  • <strong className="text-white">10-Minute Validity:</strong> For your security, this verification code will expire in <strong>10 minutes</strong>.
                </Text>
                <Text className="text-zinc-300 text-xs leading-5 m-0 mb-2">
                  • <strong className="text-white">Expired Code:</strong> If the 10-minute window elapses, this code becomes invalid. You can request a fresh code on the reset page.
                </Text>
                <Text className="text-zinc-300 text-xs leading-5 m-0">
                  • <strong className="text-white">Security Cooldown:</strong> You have up to <strong>3 code attempts</strong>. If exceeded, a <strong>1-hour cooldown window</strong> applies before new requests can be made.
                </Text>
              </Section>

              {/* Direct Reset Action Button */}
              <Section className="mb-6">
                <AegisButton href={resetUrl}>
                  Reset Your Password
                </AegisButton>
              </Section>

              {/* Reassurance Section */}
              <Section className="border-t border-zinc-800 pt-4">
                <Text className="text-zinc-300 text-xs font-semibold m-0 mb-1">
                  Didn't request this change?
                </Text>
                <Text className="text-zinc-400 text-xs leading-relaxed m-0">
                  You can safely ignore this email—your password will remain unchanged. If you suspect someone else is attempting to access your account, please notify security immediately.
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

export default PasswordReset;

