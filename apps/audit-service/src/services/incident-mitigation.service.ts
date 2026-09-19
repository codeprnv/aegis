import {
  EDGE_REVOCATION_TTL_SECONDS,
  REDIS_AUTH_KEYS,
  REDIS_REVOKED_SENTINEL,
} from '@aegis/auth';
import { logger } from '@aegis/common';
import { redis } from '@aegis/database';
import {
  enqueueNotification,
  enqueueSecurityRevocation,
  NotificationEvent,
  SecurityEvent,
} from '@aegis/events';

export interface ImpossibleTravelIncidentContext {
  userId: string;
  sessionId: string;
  email: string;
  ipAddress: string;
  currentCity?: string;
  previousCity?: string;
  velocityKmH: number;
  timestamp: number;
}

export interface NewDeviceIncidentContext {
  userId: string;
  email: string;
  deviceName?: string;
  browserName?: string;
  osName?: string;
  ipAddress: string;
  location?: string;
  timestamp: number;
}

/**
 * Executes rapid incident mitigation responses upon anomaly detection.
 * Performs synchronous edge session invalidation in <5ms, notifies IAM for database state
 * synchronization, and dispatches end-user email alerts.
 */
export class IncidentMitigationService {
  private readonly frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Mitigates an impossible-travel anomaly incident:
   * 1. Pre-emptively writes the session ID to the edge Redis revocation blocklist (<5ms).
   * 2. Emits an AUTH_SESSION_REVOKE event to IAM to persist revocation in PostgreSQL.
   * 3. Dispatches an URGENT_SECURITY_ALERT notification event for immediate user notification.
   *
   * @param ctx - Impossible travel context and parameters
   */
  public async mitigateImpossibleTravel(
    ctx: ImpossibleTravelIncidentContext
  ): Promise<void> {
    const startTime = Date.now();

    // Step 1: Pre-emptive Edge Revocation via Redis Sentinel (<5ms)
    // Synchronously revoke the active session AND block the user at the edge
    try {
      await Promise.all([
        redis.setex(
          REDIS_AUTH_KEYS.REVOKED_SESSION(ctx.sessionId),
          EDGE_REVOCATION_TTL_SECONDS,
          REDIS_REVOKED_SENTINEL
        ),
        redis.setex(
          REDIS_AUTH_KEYS.REVOKED_USER(ctx.userId),
          EDGE_REVOCATION_TTL_SECONDS,
          REDIS_REVOKED_SENTINEL
        ),
      ]);
      const edgeLatency = Date.now() - startTime;
      logger.warn(
        {
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          edgeLatencyMs: edgeLatency,
        },
        'Pre-emptive edge session and user account lockdown executed'
      );
    } catch (err: unknown) {
      logger.error(
        {
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          error: err instanceof Error ? err.message : String(err),
        },
        'Failed to execute pre-emptive edge revocation'
      );
    }

    // Step 2: Notify IAM for permanent DB session state revocation & Tier 1 Account Lockdown
    try {
      await enqueueSecurityRevocation(SecurityEvent.AUTH_SESSION_REVOKE, {
        sessionId: ctx.sessionId,
        userId: ctx.userId,
        reason: `Impossible travel detected: ${ctx.velocityKmH} km/h (Tier 1 Account Compromise)`,
        source: 'AUDIT_SERVICE',
        lockAccount: true,
        forcePasswordChange: true,
        revokeAllUserSessions: true,
      });
    } catch (err: unknown) {
      logger.error(
        {
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          error: err instanceof Error ? err.message : String(err),
        },
        'Failed to enqueue session revocation and lockdown to IAM queue'
      );
    }

    // Step 3: Trigger urgent user security alert email with generic recovery route (zero ID leakage)
    try {
      await enqueueNotification(NotificationEvent.URGENT_SECURITY_ALERT, {
        userId: ctx.userId,
        email: ctx.email,
        alertType: 'IMPOSSIBLE_TRAVEL',
        ipAddress: ctx.ipAddress,
        currentCity: ctx.currentCity,
        previousCity: ctx.previousCity,
        velocityKmH: ctx.velocityKmH,
        timestamp: ctx.timestamp,
        lockdownUrl: `${this.frontendUrl}/forgot-password`,
      });
    } catch (err: unknown) {
      logger.error(
        {
          userId: ctx.userId,
          email: ctx.email,
          error: err instanceof Error ? err.message : String(err),
        },
        'Failed to enqueue urgent security alert notification'
      );
    }
  }

  /**
   * Dispatches a new device login notification to the user.
   *
   * @param ctx - New device context details
   */
  public async notifyNewDevice(ctx: NewDeviceIncidentContext): Promise<void> {
    try {
      await enqueueNotification(NotificationEvent.SECURITY_LOGIN_ALERT, {
        userId: ctx.userId,
        email: ctx.email,
        deviceName: ctx.deviceName,
        browserName: ctx.browserName,
        osName: ctx.osName,
        ipAddress: ctx.ipAddress,
        location: ctx.location,
        timestamp: ctx.timestamp,
        reviewUrl: `${this.frontendUrl}/settings/security/devices`,
      });
    } catch (err: unknown) {
      logger.error(
        {
          userId: ctx.userId,
          email: ctx.email,
          error: err instanceof Error ? err.message : String(err),
        },
        'Failed to enqueue new device login alert notification'
      );
    }
  }
}

export const incidentMitigationService = new IncidentMitigationService();
