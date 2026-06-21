import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { propagateCookies } from '@/lib/cookie-utils';
import { getCorrelationId } from '@/lib/request-context';

const API_BASE_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callback') || '/dashboard';
  
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  // If there's no refresh token, we can't refresh. Send to logout to clear any stale state.
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/api/auth/logout', request.url), 303);
  }

  const correlationId = await getCorrelationId();

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      // The backend will send back new Set-Cookie headers
      // We can use propagateCookies because Route Handlers ARE allowed to use cookies().set()
      await propagateCookies(response);

      // Redirect the user back to their original page
      return NextResponse.redirect(new URL(callbackUrl, request.url), 303);
    } else {
      // Refresh token is invalid or expired
      return NextResponse.redirect(new URL('/api/auth/logout', request.url), 303);
    }
  } catch (error) {
    // Backend is down, etc. Don't clear cookies yet, just show login.
    return NextResponse.redirect(new URL('/login', request.url), 303);
  }
}
