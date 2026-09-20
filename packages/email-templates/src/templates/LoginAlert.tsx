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
 * Properties for the LoginAlert email template.
 */
export interface LoginAlertProps {
  /** User display identifier. */
  username?: string;
  /** Name or model of the device (e.g., iPhone 15, MacBook Pro). */
  deviceName?: string;
  /** Browser family and version (e.g., Chrome 128.0). */
  browserName?: string;
  /** Operating system (e.g., macOS 14.5, Windows 11). */
  osName?: string;
  /** Client IP address of the login attempt. */
  ipAddress?: string;
  /** Approximate geographic location (e.g., London, United Kingdom). */
  location?: string;
  /** Epoch timestamp in milliseconds. */
  timestamp?: number;
  /** Security center URL to inspect active sessions. */
  reviewUrl?: string;
  /** Direct email address for security incident escalation. */
  supportEmail?: string;
}

/**
 * Security notification dispatched when an account sign-in originates from
 * an unrecognized physical device, browser, or geographic location.
 */
export const LoginAlert: React.FC<LoginAlertProps> = ({
  username = 'Operator',
  deviceName = 'Unknown Device',
  browserName = 'Unknown Browser',
  osName = 'Unknown OS',
  ipAddress = 'Unknown IP',
  location = 'Unknown Location',
  timestamp = Date.now(),
  reviewUrl = 'http://localhost:3000/settings/security',
  supportEmail = 'security@codeprnv.org',
}) => {
  const formattedDate = new Date(timestamp).toUTCString();

  return (
    <Html>
      <Preview>New sign-in detected on your Aegis account</Preview>
      <AegisTailwind>
        <Body className="bg-background text-textMain font-sans p-4">
          <Container className="max-w-2xl w-full mx-auto bg-surface p-8 rounded-lg border border-zinc-800">
            <Header />

            <Section>
              {/* Amber Notice Badge */}
              <Section className="mb-4 inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <Text className="text-xs font-mono font-bold text-amber-400 m-0 uppercase tracking-wider">
                  ⚠️ New Sign-In Detected
                </Text>
              </Section>

              <Text className="text-2xl font-bold mb-2 text-white">
                New Device or Location Sign-In
              </Text>

              <Text className="text-zinc-300 text-sm leading-relaxed mb-6">
                Hi <strong>{username}</strong>, your Aegis account was recently
                accessed from a device or location we haven't seen before.
              </Text>

              {/* Telemetry Card */}
              <Section className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <Text className="text-xs font-mono uppercase text-zinc-400 font-bold m-0 mb-3 tracking-wider">
                  Session Telemetry
                </Text>

                <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Device &amp; OS:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#ffffff', fontWeight: 500, fontSize: '12px' }}>
                        {deviceName} ({osName})
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Browser:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#ffffff', fontWeight: 500, fontSize: '12px' }}>
                        {browserName}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>IP Address:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 500, fontSize: '12px' }}>
                        {ipAddress}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Location:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#ffffff', fontWeight: 500, fontSize: '12px' }}>
                        {location}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#a1a1aa', fontSize: '12px' }}>Time:</td>
                      <td align="right" style={{ padding: '6px 0', color: '#a1a1aa', fontFamily: 'monospace', fontSize: '12px' }}>
                        {formattedDate}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              {/* CTA */}
              <Section className="mb-6">
                <AegisButton href={reviewUrl}>
                  Review Security Activity
                </AegisButton>
              </Section>

              {/* Urgent Compromise Box */}
              <Section className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl">
                <Text className="text-xs font-bold uppercase tracking-wider text-rose-400 m-0 mb-1 font-mono">
                  Don't recognize this activity?
                </Text>
                <Text className="text-xs text-rose-200 leading-relaxed m-0 mb-3">
                  Someone else may have accessed your account. We recommend
                  revoking this session immediately and resetting your password
                  in the Security Center.
                </Text>
                <a
                  href={`mailto:${supportEmail}?subject=Urgent:%20Unrecognized%20Login%20Alert%20for%20${encodeURIComponent(username)}`}
                  className="text-xs text-brand underline font-medium"
                >
                  Report suspicious activity to security team &rarr;
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

export default LoginAlert;
