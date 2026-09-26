import { getClientTelemetryHeaders } from '@/lib/request-context';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = `${process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080'}/v1`;

/**
 * Handles client logout by notifying the backend API Gateway to invalidate
 * active session state and clearing local authentication cookies.
 *
 * @param request - Incoming Next.js HTTP request.
 * @returns 303 redirect response to login route with cleared cookies.
 */
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  const telemetryHeaders = await getClientTelemetryHeaders();

  try {
    if (cookieHeader) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
          Cookie: cookieHeader,
          ...telemetryHeaders,
        },
        cache: 'no-store',
      });
    }
  } catch {
    // Graceful fallback to proceed with local cookie clearance if backend is unavailable
  }

  const response = NextResponse.redirect(new URL('/login', request.nextUrl), 303);

  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
}

export const POST = GET;

