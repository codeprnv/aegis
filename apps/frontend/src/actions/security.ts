'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-fetch';

export interface SecurityActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Revokes an active user session.
 * If the session is the user's current session, clears authentication cookies and redirects to login.
 *
 * @param sessionId - Unique identifier of the session to terminate
 * @param isCurrentSession - Whether the targeted session matches the active browser session
 */
export async function revokeSessionAction(
  sessionId: string,
  isCurrentSession?: boolean
): Promise<SecurityActionResult> {
  if (!sessionId) {
    return { success: false, error: 'Session ID is required' };
  }

  const result = await serverFetch<{ message: string }>(
    `/auth/sessions/${sessionId}`,
    {
      method: 'DELETE',
    }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to revoke session',
    };
  }

  if (isCurrentSession) {
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    redirect('/login?reason=session_terminated');
  }

  revalidatePath('/settings/security');
  revalidatePath('/dashboard');

  return {
    success: true,
    message: result.data?.message || 'Session revoked successfully',
  };
}

/**
 * Revokes all other active sessions belonging to the current user.
 * Preserves the current active session.
 */
export async function revokeAllOtherSessionsAction(): Promise<SecurityActionResult> {
  const result = await serverFetch<{ message: string; revokedCount: number }>(
    '/auth/sessions',
    {
      method: 'DELETE',
    }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to revoke other sessions',
    };
  }

  revalidatePath('/settings/security');
  revalidatePath('/dashboard');

  return {
    success: true,
    message:
      result.data?.message ||
      `Successfully revoked other active sessions`,
  };
}

/**
 * Removes a trusted device from the user's remembered devices registry.
 *
 * @param deviceId - Unique UUID identifier of the trusted device record
 */
export async function untrustDeviceAction(
  deviceId: string
): Promise<SecurityActionResult> {
  if (!deviceId) {
    return { success: false, error: 'Device ID is required' };
  }

  const result = await serverFetch<{ message: string }>(
    `/audit/devices/${deviceId}`,
    {
      method: 'DELETE',
    }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to remove device',
    };
  }

  revalidatePath('/settings/security');

  return {
    success: true,
    message: result.data?.message || 'Device removed successfully',
  };
}

/**
 * Fetches an additional page of security audit logs for infinite scrolling or pagination.
 *
 * @param offset - Pagination offset
 * @param limit - Number of logs to retrieve
 */
export async function fetchMoreAuditLogsAction(
  offset: number = 0,
  limit: number = 20
) {
  const result = await serverFetch<{
    logs: Array<{
      id: string;
      eventId: string;
      action: string;
      status: string;
      ipAddress: string;
      city?: string;
      country?: string;
      browserName?: string;
      osName?: string;
      deviceType?: string;
      deviceName?: string;
      riskScore?: number;
      createdAt: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }>(`/audit/logs?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  });

  return result;
}
