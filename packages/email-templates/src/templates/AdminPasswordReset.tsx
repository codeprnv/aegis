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
 * Properties for the AdminPasswordReset template.
 */
interface AdminPasswordResetProps {
  /** Recipient username or display identifier. */
  username: string;
  /** Temporary administrative password assigned to the account. */
  temporaryPassword: string;
  /** Fully qualified login destination URL. */
  loginUrl?: string;
  /** Direct email address for security incident escalation. */
  supportEmail?: string;
}

/**
 * Transactional security email dispatched when an administrator resets user credentials.
 * Delivers the temporary password, enforces the 24-hour expiration rule and mandatory
 * rotation policy upon sign-in, and provides a direct CTA to authenticate.
 */
export const AdminPasswordReset = ({
  username = 'Operator',
  temporaryPassword = 'temporary_password',
  loginUrl = 'http://localhost:3000/login',
  supportEmail = 'security@codeprnv.org',
}: AdminPasswordResetProps) => {
  return (
    <Html>
      <Preview>Temporary Password Issued for Aegis</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-2xl font-bold mb-2 text-white">
                Temporary Password Issued
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Hi <strong>{username}</strong>, a system administrator has reset your password
                and issued temporary login credentials for your Aegis account.
              </Text>

              {/* Hero Temporary Password Card */}
              <Section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 shadow-inner">
                <Text className="text-xs font-mono uppercase tracking-widest text-brand font-semibold m-0 mb-2">
                  🔑 Temporary Password
                </Text>

                <div
                  className="my-3 p-4 bg-black border border-zinc-700 rounded-lg text-center select-all"
                  style={{ userSelect: 'all', WebkitUserSelect: 'all' }}
                >
                  <span className="text-2xl font-mono tracking-wider text-brand font-bold select-all">
                    {temporaryPassword}
                  </span>
                </div>

                <Text className="text-zinc-500 text-xs text-center m-0">
                  Single-click or tap on the password to highlight all characters.
                </Text>
              </Section>

              {/* Left-bordered Alert 1: 24-Hour Expiration (Luminous Coral #fb7185) */}
              <Section
                className="mb-2.5 px-3.5 py-2.5 bg-rose-950/20 border-l-2 border-rose-400 rounded-r-lg"
                style={{ borderLeft: '3px solid #fb7185' }}
              >
                <Text
                  className="text-xs font-bold font-mono uppercase tracking-wider text-rose-400 m-0 mb-1"
                  style={{ color: '#fb7185' }}
                >
                  ⏱️ Temporary Password Expires in 24 Hours
                </Text>
                <Text className="text-xs text-zinc-300 leading-relaxed m-0" style={{ color: '#d4d4d8' }}>
                  Valid for <strong className="text-white">24 hours</strong> only. After expiration, an administrator must re-issue credentials.
                </Text>
              </Section>

              {/* Left-bordered Alert 2: Mandatory Action Upon Login */}
              <Section
                className="mb-6 px-3.5 py-2.5 bg-amber-950/20 border-l-2 border-amber-400 rounded-r-lg"
                style={{ borderLeft: '3px solid #fbbf24' }}
              >
                <Text
                  className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400 m-0 mb-1"
                  style={{ color: '#fbbf24' }}
                >
                  ⚠️ Mandatory Action Upon Login
                </Text>
                <Text className="text-xs text-zinc-300 leading-relaxed m-0" style={{ color: '#d4d4d8' }}>
                  You will be required to set a permanent password immediately upon sign-in.
                </Text>
              </Section>

              {/* Primary Action Button */}
              <Section className="mb-6">
                <AegisButton href={loginUrl}>
                  Log In to Reset Password
                </AegisButton>
              </Section>

              {/* Security Escalation Note with Inlined Immediate Release Valve */}
              <Section className="border-t border-zinc-800 pt-4">
                <Text className="text-white text-xs font-bold m-0 mb-1">
                  🛡️ Didn't request this reset?
                </Text>
                <Text className="text-zinc-300 text-xs leading-relaxed m-0 mb-3" style={{ color: '#d4d4d8' }}>
                  If you did not request administrator assistance to reset your account credentials, your account may be compromised.
                </Text>
                <a
                  href={`mailto:${supportEmail}?subject=CRITICAL:%20Unauthorized%20Admin%20Reset%20for%20${encodeURIComponent(username)}`}
                  className="inline-block px-3 py-1.5 bg-rose-950/40 border border-rose-700/60 rounded text-xs font-mono font-semibold"
                  style={{
                    color: '#fb7185',
                    backgroundColor: 'rgba(76, 5, 25, 0.4)',
                    border: '1px solid rgba(190, 18, 60, 0.6)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  ⚠️ Report Unauthorized Reset Immediately →
                </a>
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
