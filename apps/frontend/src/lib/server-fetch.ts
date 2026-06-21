// ============================================================
// FILE: apps/frontend/src/lib/server-fetch.ts
// PURPOSE: Server-side fetch wrapper with lazy token refresh
// STRATEGY: Uses native fetch (for Next.js caching benefits).
//           On 401, automatically refreshes the token and retries.
// ============================================================


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

export async function serverFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ServerFetchResult<T>> {
  const url = `${API_BASE_URL}${path}`;
  const cookieHeader = await buildCookieHeader();
  const correlationId = await getCorrelationId();

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      Cookie: cookieHeader,
      ...options.headers,
    },
    cache: options.cache ?? 'no-store',
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    // We cannot refresh and mutate cookies inside a Server Component fetch.
    // Instead, redirect to the Route Handler which CAN mutate cookies.
    redirect('/api/auth/refresh');
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
