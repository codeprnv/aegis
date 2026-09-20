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
 * Properties for the SecurityAlert email template.
 */
export interface SecurityAlertProps {
  /** User display identifier. */
  username?: string;
  /** Categorized security anomaly type. */
  alertType:
    | 'IMPOSSIBLE_TRAVEL'
    | 'TOKEN_REUSE_DETECTED'
    | 'SESSION_TERMINATED';
  /** IP address associated with the anomaly. */
  ipAddress?: string;
  /** City where current activity occurred. */
  currentCity?: string;
  /** City where previous activity occurred. */
  previousCity?: string;
  /** Spherical velocity calculated in km/h. */
  velocityKmH?: number;
  /** Epoch timestamp in milliseconds. */
  timestamp?: number;
  /** Direct URL to lock down credentials or review active sessions. */
  lockdownUrl?: string;
  /** Direct support/security contact email. */
  supportEmail?: string;
}

/**
 * Critical security incident notification dispatched when the Dual-Speed Anomaly Engine
 * detects impossible travel, token reuse, or initiates pre-emptive edge session termination.
 */
export const SecurityAlert: React.FC<SecurityAlertProps> = ({
  username = 'Operator',
  alertType = 'IMPOSSIBLE_TRAVEL',
  ipAddress = 'Unknown IP',
  currentCity = 'Unknown City',
  previousCity = 'Unknown City',
  velocityKmH,
  timestamp = Date.now(),
  lockdownUrl = 'http://localhost:3000/settings/security',
  supportEmail = 'security@codeprnv.org',
}) => {
  const formattedDate = new Date(timestamp).toUTCString();

  const getAlertTitle = () => {
    switch (alertType) {
      case 'IMPOSSIBLE_TRAVEL':
        return 'Impossible Travel Anomaly Detected';
      case 'TOKEN_REUSE_DETECTED':
        return 'Refresh Token Reuse Detected';
      case 'SESSION_TERMINATED':
      default:
        return 'Suspicious Session Terminated';
    }
  };

  return (
    <Html>
      <Preview>
        CRITICAL SECURITY ALERT: Suspicious activity detected on Aegis
      </Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-rose-900/60 shadow-2xl">
            <Header />

            <Section>
              {/* Critical Alert Badge */}
              <Section className="mb-4 inline-block px-3 py-1 bg-rose-500/20 border border-rose-500/50 rounded-full">
                <Text className="text-xs font-mono font-bold text-rose-400 m-0 uppercase tracking-widest">
                  🚨 Critical Security Incident
                </Text>
              </Section>

              <Text className="text-2xl font-bold mb-2 text-white">
                {getAlertTitle()}
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Hi <strong>{username}</strong>, the Aegis Deep-Lane Anomaly
                Engine detected high-risk, unusual activity associated with your
                account. To protect your identity and data,
                <strong>
                  {' '}
                  the affected session was immediately terminated at the edge
                </strong>
                .
              </Text>

              {/* Incident Details Card */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <Text className="text-xs font-mono uppercase text-zinc-400 font-bold m-0 mb-3 tracking-wider">
                  Incident Intelligence
                </Text>

                <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Incident Type:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#f87171', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px' }}>
                        {alertType}
                      </td>
                    </tr>
                    {alertType === 'IMPOSSIBLE_TRAVEL' && (
                      <>
                        <tr style={{ borderBottom: '1px solid #27272a' }}>
                          <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Travel Vector:</td>
                          <td align="right" style={{ padding: '6px 0', color: '#ffffff', fontWeight: 500, fontSize: '12px' }}>
                            {previousCity} &rarr; {currentCity}
                          </td>
                        </tr>
                        {typeof velocityKmH === 'number' && (
                          <tr style={{ borderBottom: '1px solid #27272a' }}>
                            <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Calculated Velocity:</td>
                            <td align="right" style={{ padding: '6px 0', color: '#fda4af', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px' }}>
                              {Math.round(velocityKmH).toLocaleString()} km/h
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Flagged IP:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 500, fontSize: '12px' }}>
                        {ipAddress}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Timestamp:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#a1a1aa', fontFamily: 'monospace', fontSize: '12px' }}>
                        {formattedDate}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              {/* Action Section */}
              <Section className="mb-6">
                <Text className="text-xs text-zinc-300 mb-3">
                  All active sessions belonging to the compromised vector have
                  been invalidated. Please review your security settings and
                  rotate your credentials immediately:
                </Text>
                <AegisButton href={lockdownUrl}>
                  Lock Down Your Account
                </AegisButton>
              </Section>

              {/* Help & Escalation */}
              <Section className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <Text className="text-xs text-zinc-400 leading-relaxed m-0">
                  If you need immediate assistance or did not initiate these
                  requests, please contact our Security Operations Center at{' '}
                  <a
                    href={`mailto:${supportEmail}?subject=EMERGENCY:%20Compromised%20Account%20for%20${encodeURIComponent(username)}`}
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

export default SecurityAlert;
