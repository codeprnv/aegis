// ============================================================
// FILE: apps/frontend/src/lib/server-fetch.ts
// PURPOSE: Server-side fetch wrapper with lazy token refresh
// STRATEGY: Uses native fetch (for Next.js caching benefits).
//           On 401, automatically refreshes the token and retries.
// ============================================================


import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildCookieHeader } from './cookie-utils';
import { getCorrelationId } from './request-context';

const API_BASE_URL = `${process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080'}/v1`;

export interface ServerFetchResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Extracts and sanitizes client telemetry and IP information from the incoming request.
 * Prioritizes trusted proxy headers before falling back to X-Forwarded-For or localhost.
 */
async function getClientTelemetryHeaders(): Promise<Record<string, string>> {
  try {
    const incomingHeaders = await headers();
    const rawForwardedFor = incomingHeaders.get('x-forwarded-for');
    const realIp =
      incomingHeaders.get('cf-connecting-ip') ||
      incomingHeaders.get('x-real-ip') ||
      (rawForwardedFor ? rawForwardedFor.split(',')[0].trim() : '127.0.0.1');

    const telemetryHeaders: Record<string, string> = {
      'X-Forwarded-For': realIp,
      'X-Real-IP': realIp,
    };

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

export async function serverFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ServerFetchResult<T>> {
  const url = `${API_BASE_URL}${path}`;
  const cookieHeader = await buildCookieHeader();
  const correlationId = await getCorrelationId();
  const telemetryHeaders = await getClientTelemetryHeaders();

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      Cookie: cookieHeader,
      ...telemetryHeaders,
      ...options.headers,
    },
    cache: options.cache ?? 'no-store',
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    // Check if a refresh token actually exists in cookies before redirecting to refresh route.
    // If no refresh token exists, redirecting to refresh will fail and loop; send directly to login.
    const cookieStore = await cookies();
    const hasRefreshToken = Boolean(cookieStore.get('refresh_token')?.value);

    if (hasRefreshToken) {
      redirect('/api/auth/refresh');
    }

    redirect('/login');
  }

  try {
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data as T,
      status: response.status,
    };
  } catch {
    return {
      success: false,
      error: 'Failed to parse response',
      status: response.status,
    };
  }
}
