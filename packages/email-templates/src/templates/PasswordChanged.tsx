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
 * Properties for the PasswordChanged template.
 */
interface PasswordChangedProps {
  /** Recipient username or display identifier. */
  username: string;
  /** Fully qualified login destination or security center URL. */
  loginUrl?: string;
  /** Direct email address for security incident escalation. */
  supportEmail?: string;
}

/**
 * Transactional security alert email dispatched when an authenticated user rotates their password.
 * Informs the user of the credential change, notes other device session logouts, and provides
 * an urgent escalation path for unauthorized activity.
 */
export const PasswordChanged = ({
  username = 'Operator',
  loginUrl = 'http://localhost:3000/login',
  supportEmail = 'security@codeprnv.org',
}: PasswordChangedProps) => {
  return (
    <Html>
      <Preview>Your Aegis account password was recently changed</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-2xl font-bold mb-2 text-white">
                Your Password Was Changed
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Hi <strong>{username}</strong>, the password for your Aegis account was recently updated.
                For your security, all active sessions on other devices have been automatically logged out.
              </Text>

              {/* Expressive Security Details Card */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <Section className="mb-4">
                  <Text className="text-sm font-semibold text-white m-0">
                    ✅ Password Updated Successfully
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    Your new credentials are active and protecting your account.
                  </Text>
                </Section>

                <Section>
                  <Text className="text-sm font-semibold text-white m-0">
                    🔒 All Other Sessions Signed Out
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    For your security, active logins on other phones, browsers, and devices were terminated.
                  </Text>
                </Section>
              </Section>

              {/* Primary Action Button */}
              <Section className="mb-6">
                <AegisButton href={loginUrl}>
                  Review Account Security
                </AegisButton>
              </Section>

              {/* Urgent Compromise Alert Box */}
              <Section className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl">
                <Text className="text-xs font-bold uppercase tracking-wider text-rose-400 m-0 mb-1 font-mono">
                  ⚠️ Didn't Make This Change?
                </Text>
                <Text className="text-xs text-rose-200 leading-relaxed m-0 mb-3">
                  If you did not authorize this change, your account may have been compromised by an unauthorized party.
                </Text>
                <AegisButton href={`mailto:${supportEmail}?subject=Urgent:%20Unauthorized%20Password%20Change%20for%20${encodeURIComponent(username)}`}>
                  Report Unauthorized Activity
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

export default PasswordChanged;

