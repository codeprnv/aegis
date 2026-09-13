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
 * Properties for the PasswordResetConfirmed template.
 */
interface PasswordResetConfirmedProps {
  /** Recipient username or display identifier. */
  username: string;
  /** Fully qualified login destination URL. */
  loginUrl?: string;
  /** Direct email address for security incident escalation. */
  supportEmail?: string;
}

/**
 * Transactional email dispatched when a user successfully concludes the account recovery flow.
 * Confirms that recovery concluded, notes that all prior active sessions were revoked,
 * and provides a direct CTA to log in with new credentials.
 */
export const PasswordResetConfirmed = ({
  username = 'Operator',
  loginUrl = 'http://localhost:3000/login',
  supportEmail = 'security@codeprnv.org',
}: PasswordResetConfirmedProps) => {
  return (
    <Html>
      <Preview>Your Aegis password reset was successful</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-2xl font-bold mb-2 text-white">
                Password Reset Completed
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Hi <strong>{username}</strong>, your password reset was successful!
                Your account has been updated with your new password.
              </Text>

              {/* Recovery Details Summary Card */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <Section className="mb-4">
                  <Text className="text-sm font-semibold text-white m-0">
                    ✅ New Password Active
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    Your account has been secured with your new password.
                  </Text>
                </Section>

                <Section>
                  <Text className="text-sm font-semibold text-white m-0">
                    🛡️ All Active Sessions Terminated
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    All existing sessions across all devices were logged out for your safety. Please sign in again to continue.
                  </Text>
                </Section>
              </Section>

              {/* Primary Action Button (Direct Login CTA) */}
              <Section className="mb-6">
                <AegisButton href={loginUrl}>
                  Log In to Your Account
                </AegisButton>
              </Section>

              {/* Urgent Compromise Alert Box */}
              <Section className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl">
                <Text className="text-xs font-bold uppercase tracking-wider text-rose-400 m-0 mb-1 font-mono">
                  ⚠️ Didn't Reset Your Password?
                </Text>
                <Text className="text-xs text-rose-200 leading-relaxed m-0 mb-3">
                  If you did not perform this password reset, someone may have compromised your email inbox or account access.
                </Text>
                <AegisButton href={`mailto:${supportEmail}?subject=CRITICAL:%20Unauthorized%20Password%20Reset%20for%20${encodeURIComponent(username)}`}>
                  Report Unauthorized Recovery
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

export default PasswordResetConfirmed;

