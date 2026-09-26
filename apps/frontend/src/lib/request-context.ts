import { headers } from 'next/headers';

/**
 * Retrieves the X-Correlation-ID from the current request context.
 * Falls back to a new UUID if unavailable (e.g., during build-time prerendering).
 */
export async function getCorrelationId(): Promise<string> {
  try {
    const requestHeaders = await headers();
    return requestHeaders.get('x-correlation-id') || crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}

import crypto from 'node:crypto';

/**
 * Extracts and sanitizes client telemetry and IP information from the incoming request context.
 * Prioritizes un-spoofable platform edge headers (Vercel x-vercel-forwarded-for, Cloudflare cf-connecting-ip)
 * and attaches a cryptographic HMAC-SHA256 signature when EDGE_INGRESS_SECRET is configured.
 *
 * @returns Key-value map of sanitized telemetry headers to forward downstream
 */
export async function getClientTelemetryHeaders(): Promise<Record<string, string>> {
  try {
    const incomingHeaders = await headers();

    // 1. Edge-authenticated platform headers (un-spoofable by external clients)
    const cfConnectingIp = incomingHeaders.get('cf-connecting-ip');
    const vercelForwardedFor = incomingHeaders.get('x-vercel-forwarded-for');
    const vercelIp = incomingHeaders.get('x-vercel-ip');

    let realIp =
      cfConnectingIp?.trim() ||
      (vercelForwardedFor ? vercelForwardedFor.split(',')[0].trim() : '') ||
      vercelIp?.trim();

    // 2. Fallback for non-Vercel environments (e.g., local development, Docker)
    if (!realIp) {
      const xRealIp = incomingHeaders.get('x-real-ip');
      const rawForwardedFor = incomingHeaders.get('x-forwarded-for');
      realIp =
        xRealIp?.trim() ||
        (rawForwardedFor ? rawForwardedFor.split(',')[0].trim() : '') ||
        '127.0.0.1';
    }

    const telemetryHeaders: Record<string, string> = {
      'X-Forwarded-For': realIp,
      'X-Real-IP': realIp,
    };

    // 3. Cryptographic Edge Ingress Signature (HMAC-SHA256)
    const edgeSecret = process.env.EDGE_INGRESS_SECRET;
    if (edgeSecret && realIp && realIp !== '127.0.0.1') {
      const timestamp = Date.now().toString();
      const hmac = crypto
        .createHmac('sha256', edgeSecret)
        .update(`${realIp}:${timestamp}`)
        .digest('hex');

      telemetryHeaders['X-Aegis-Signature'] = `${timestamp}.${hmac}`;
    }

    const userAgent = incomingHeaders.get('user-agent');
    if (userAgent) telemetryHeaders['User-Agent'] = userAgent;

    const acceptLanguage = incomingHeaders.get('accept-language');
    if (acceptLanguage) telemetryHeaders['Accept-Language'] = acceptLanguage;

    const secChUa = incomingHeaders.get('sec-ch-ua');
    if (secChUa) telemetryHeaders['Sec-CH-UA'] = secChUa;

    const secChUaPlatform = incomingHeaders.get('sec-ch-ua-platform');
    if (secChUaPlatform) telemetryHeaders['Sec-CH-UA-Platform'] = secChUaPlatform;

    return telemetryHeaders;
  } catch {
    return {
      'X-Forwarded-For': '127.0.0.1',
      'X-Real-IP': '127.0.0.1',
    };
  }
}

