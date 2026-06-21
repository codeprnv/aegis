'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildCookieHeader, propagateCookies } from '../lib/cookie-utils';
import { getCorrelationId } from '../lib/request-context';

const API_BASE_URL = `${process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080'}/v1`;

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Authenticates a user with the API Gateway and establishes a secure session.
 * Automatically propagates HTTP-only cookies to the Next.js context upon success.
 */
export async function loginAction(formData: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<AuthActionResult> {
  try {
    const correlationId = await getCorrelationId();

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(formData),
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Invalid credentials or server error.',
      };
    }

    // Extract and set cookies from the Express response
    await propagateCookies(response);

    return { success: true, message: 'Login successful' };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Submits user registration payload to the API Gateway.
 * Registration triggers an email verification flow; no session is established.
 */
export async function registerAction(formData: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  try {
    const correlationId = await getCorrelationId();

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(formData),
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Registration failed. Please try again.',
      };
    }

    return {
      success: true,
      message:
        data.message ||
        'Registration accepted. Please check your email to verify your account.',
    };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Verifies a user's email address via the provided token.
 * Upon successful verification, the API Gateway establishes a session and returns HTTP-only cookies.
 */
export async function verifyEmailAction(
  token: string
): Promise<AuthActionResult> {
  try {
    const correlationId = await getCorrelationId();

    const response = await fetch(
      `${API_BASE_URL}/auth/verify-email?token=${token}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error:
          data.message ||
          'Verification failed. The token may be invalid or expired.',
      };
    }

    // Extract and set cookies — user is now authenticated
    await propagateCookies(response);

    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred during verification.',
    };
  }
}

/**
 * Invalidates the current user session at the API Gateway and clears local Next.js cookies.
 * Redirects the user to the login page upon completion.
 */
export async function logoutAction(): Promise<void> {
  try {
    const correlationId = await getCorrelationId();
    const cookieHeader = await buildCookieHeader();

    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });
  } catch {
    // Even if the backend call fails, we still clear the cookies locally
  }

  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');

  redirect('/login');
}
