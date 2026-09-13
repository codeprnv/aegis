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
 * Properties for the WelcomeEmail template.
 */
interface WelcomeEmailProps {
  /** Recipient username or display identifier. */
  username: string;
  /** Fully qualified login destination URL. */
  loginUrl?: string;
}

/**
 * Transactional onboarding email dispatched upon registration completion or initial identity verification.
 * Welcomes the user, highlights core security platform capabilities, and provides a direct dashboard CTA.
 */
export const WelcomeEmail = ({
  username = 'Operator',
  loginUrl = 'http://localhost:3000/login',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Preview>Welcome to Aegis! Your account is active and ready.</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              <Text className="text-2xl font-bold mb-2 text-white">
                Welcome to Aegis, {username}! 👋
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                We're thrilled to have you on board. Your account is now active,
                giving you complete peace of mind and powerful security controls to
                protect your digital identity.
              </Text>

              {/* Feature Value Showcase Card */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <Text className="text-xs font-mono uppercase tracking-widest text-brand font-semibold m-0 mb-4">
                  ✨ What you get with Aegis
                </Text>

                <Section className="mb-3">
                  <Text className="text-sm font-semibold text-white m-0">
                    🛡️ Unified Security Dashboard
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    Manage your credentials, connected services, and preferences from one central place.
                  </Text>
                </Section>

                <Section className="mb-3">
                  <Text className="text-sm font-semibold text-white m-0">
                    ⚡ Real-Time Activity Alerts
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    Get instant notifications whenever a new device signs in or important account changes happen.
                  </Text>
                </Section>

                <Section>
                  <Text className="text-sm font-semibold text-white m-0">
                    🔐 Instant Session Controls
                  </Text>
                  <Text className="text-zinc-400 text-xs leading-relaxed m-0 mt-1">
                    See all active logins across your devices and securely revoke unrecognized sessions in one click.
                  </Text>
                </Section>
              </Section>

              {/* Primary Call to Action */}
              <Section className="mb-5">
                <AegisButton href={loginUrl}>
                  Go to Your Dashboard
                </AegisButton>
              </Section>

              <Text className="text-zinc-400 text-xs leading-relaxed mt-4 m-0">
                Need help getting started? Our support team is always here for you.
              </Text>
            </Section>

            <Footer />
          </Container>
        </Body>
      </AegisTailwind>
    </Html>
  );
};

export default WelcomeEmail;

