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
