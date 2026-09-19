import { logger } from '@aegis/common';
import { auditPrisma, redis } from '@aegis/database';
import {
  createBullMQConnection,
  SECURITY_TELEMETRY_QUEUE_NAME,
  SecurityEvent,
  type AuthLoginSuccessPayload,
} from '@aegis/events';
import { Job, Worker } from 'bullmq';
import { UAParser } from 'ua-parser-js';
import { ANOMALY_CONFIG, auditWorkerConfig } from '../config/index.js';
import { geoResolverService } from '../services/geo-resolver.service.js';
import { incidentMitigationService } from '../services/incident-mitigation.service.js';
import {
  velocityService,
  type VelocityEvaluationResult,
} from '../services/velocity.service.js';

/**
 * BullMQ Worker consuming security telemetry from the dedicated telemetry queue.
 * Performs dual-speed anomaly detection (impossible travel velocity and unrecognized devices),
 * writes edge session revocations, and archives structured security audit logs.
 */
export const startAnomalyWorker = (): Worker => {
  logger.info(
    { queue: SECURITY_TELEMETRY_QUEUE_NAME },
    'Starting Audit Anomaly Telemetry Worker...'
  );

  const worker = new Worker(
    SECURITY_TELEMETRY_QUEUE_NAME,
    async (job: Job) => {
      logger.info(
        { jobId: job.id, event: job.name },
        `Processing telemetry job ${job.id}`
      );

      if (job.name !== SecurityEvent.AUTH_LOGIN_SUCCESS) {
        logger.debug({ event: job.name }, 'Ignoring non-login telemetry event');
        return;
      }

      const payload = job.data as AuthLoginSuccessPayload;
      const {
        eventId,
        userId,
        sessionId,
        email,
        ipAddress,
        userAgent,
        deviceFingerprint,
        timestamp,
      } = payload;

      if (!eventId || !userId || !sessionId) {
        logger.warn(
          { jobId: job.id, data: job.data },
          'Invalid telemetry payload: missing required fields'
        );
        return;
      }

      // Idempotency: verify this event hasn't already been processed
      const existingLog = await auditPrisma.securityAuditLog.findUnique({
        where: { eventId },
      });
      if (existingLog) {
        logger.info({ eventId }, 'Telemetry event already processed; skipping');
        return;
      }

      // Step 1: Geolocation & User-Agent Resolution using enterprise ua-parser-js
      const geo = await geoResolverService.resolve(ipAddress);
      const uaResult = new UAParser(userAgent).getResult();
      const browserName = uaResult.browser.name || 'Unknown Browser';
      const osName = uaResult.os.name || 'Unknown OS';
      const deviceType = uaResult.device.type || 'desktop';
      const deviceName = uaResult.device.model || `${browserName} on ${osName}`;

      // Step 2: Device Recognition & Trust Assessment (Protected by PostgreSQL unique constraint)
      let isNewDevice = false;
      try {
        const existingDevice = await auditPrisma.trustedDevice.findUnique({
          where: {
            userId_deviceFingerprint: {
              userId,
              deviceFingerprint,
            },
          },
        });

        if (existingDevice) {
          await auditPrisma.trustedDevice.update({
            where: { id: existingDevice.id },
            data: {
              lastSeenAt: new Date(timestamp),
              ipAddress,
              city: geo?.city ?? existingDevice.city,
              country: geo?.country ?? existingDevice.country,
              deviceName: existingDevice.deviceName || deviceName,
              deviceType: existingDevice.deviceType || deviceType,
            },
          });
        } else {
          // Attempt atomic insertion protected by database unique constraint
          try {
            await auditPrisma.trustedDevice.create({
              data: {
                userId,
                deviceFingerprint,
                deviceType,
                deviceName,
                browserName,
                osName,
                ipAddress,
                city: geo?.city,
                country: geo?.country,
                isTrusted: false,
                lastSeenAt: new Date(timestamp),
              },
            });
            isNewDevice = true;

            // Dispatch new device login alert email (idempotency-guarded)
            const newDeviceAlertKey = `aegis:idempotency:alert:new-device:${eventId}`;
            const alertAcquired = await redis.set(newDeviceAlertKey, '1', {
              nx: true,
              ex: 86400,
            });
            if (alertAcquired) {
              await incidentMitigationService.notifyNewDevice({
                userId,
                email,
                deviceName,
                browserName,
                osName,
                ipAddress,
                location: geo?.city
                  ? `${geo.city}, ${geo.country || ''}`
                  : 'Unknown Location',
                timestamp,
              });
            } else {
              logger.info(
                { eventId, userId },
                'New device alert already dispatched for this event; skipping duplicate'
              );
            }
          } catch (createErr: unknown) {
            // Prisma P2002: Unique constraint violation (device was created concurrently)
            const isPrismaP2002 =
              typeof createErr === 'object' &&
              createErr !== null &&
              'code' in createErr &&
              (createErr as { code: string }).code === 'P2002';

            if (isPrismaP2002) {
              logger.info(
                { userId, deviceFingerprint },
                'Concurrent device registration handled cleanly via unique constraint; updating lastSeenAt'
              );
              await auditPrisma.trustedDevice.update({
                where: {
                  userId_deviceFingerprint: {
                    userId,
                    deviceFingerprint,
                  },
                },
                data: {
                  lastSeenAt: new Date(timestamp),
                  ipAddress,
                  city: geo?.city ?? undefined,
                  country: geo?.country ?? undefined,
                },
              });
            } else {
              throw createErr;
            }
          }
        }
      } catch (deviceErr: unknown) {
        logger.error(
          {
            userId,
            deviceFingerprint,
            error:
              deviceErr instanceof Error
                ? deviceErr.message
                : String(deviceErr),
          },
          'Failed to update trusted device record'
        );
      }

      // Step 3: Impossible Travel Evaluation (Ping-Pong Shield)
      // Track velocity by human identity, NOT by device fingerprint.
      // Scoping to deviceFingerprint would let an attacker on a new device bypass detection
      // because the cache lookup would return null (no prior geo for that fingerprint).
      const userGeoKey = `aegis:user:geo:${userId}`;
      let isImpossibleTravel = false;
      let velocityResult: VelocityEvaluationResult | undefined = undefined;

      if (geo?.latitude !== undefined && geo?.longitude !== undefined) {
        try {
          interface CachedGeoPoint {
            latitude: number;
            longitude: number;
            timestamp: number;
            city?: string;
          }

          const cachedPrevGeo = await redis.get<CachedGeoPoint | string>(
            userGeoKey
          );
          let prevTimestamp = 0;

          if (cachedPrevGeo) {
            const prev: CachedGeoPoint =
              typeof cachedPrevGeo === 'string'
                ? (JSON.parse(cachedPrevGeo) as CachedGeoPoint)
                : cachedPrevGeo;
            prevTimestamp = prev.timestamp;

            velocityResult = velocityService.evaluateVelocity(
              {
                latitude: prev.latitude,
                longitude: prev.longitude,
                timestamp: prev.timestamp,
              },
              {
                latitude: geo.latitude,
                longitude: geo.longitude,
                timestamp,
              }
            );

            if (velocityResult.isAnomaly) {
              isImpossibleTravel = true;
              logger.warn(
                {
                  userId,
                  sessionId,
                  velocityKmH: velocityResult.velocityKmH,
                  distanceKm: velocityResult.distanceKm,
                },
                'Impossible travel anomaly detected! Triggering mitigation'
              );

              // Pre-emptive edge block & alert (idempotency-guarded)
              const travelAlertKey = `aegis:idempotency:alert:impossible-travel:${eventId}`;
              const travelAcquired = await redis.set(travelAlertKey, '1', {
                nx: true,
                ex: 86400,
              });
              if (travelAcquired) {
                await incidentMitigationService.mitigateImpossibleTravel({
                  userId,
                  sessionId,
                  email,
                  ipAddress,
                  currentCity: geo.city,
                  previousCity: prev.city,
                  velocityKmH: velocityResult.velocityKmH,
                  timestamp,
                });
              } else {
                logger.info(
                  { eventId, userId },
                  'Impossible travel mitigation already dispatched for this event; skipping duplicate'
                );
              }
            }
          }

          // Monotonic ordering: only update cache if this event is newer than existing state
          if (!cachedPrevGeo || timestamp >= prevTimestamp) {
            await redis.setex(
              userGeoKey,
              ANOMALY_CONFIG.USER_GEO_CACHE_TTL_SECONDS,
              JSON.stringify({
                latitude: geo.latitude,
                longitude: geo.longitude,
                city: geo.city,
                country: geo.country,
                timestamp,
              })
            );
          }
        } catch (geoErr: unknown) {
          logger.error(
            {
              userId,
              error: geoErr instanceof Error ? geoErr.message : String(geoErr),
            },
            'Velocity evaluation failed'
          );
        }
      }

      // Step 4: Archive Structured Audit Log
      const action = isImpossibleTravel
        ? 'auth.anomaly.impossible_travel'
        : isNewDevice
          ? 'auth.anomaly.new_device'
          : 'auth.login.success';

      const status = isImpossibleTravel
        ? 'CRITICAL'
        : isNewDevice
          ? 'WARNING'
          : 'SUCCESS';

      try {
        await auditPrisma.securityAuditLog.create({
          data: {
            eventId,
            userId,
            action,
            status,
            ipAddress,
            userAgent,
            city: geo?.city,
            country: geo?.country,
            latitude: geo?.latitude,
            longitude: geo?.longitude,
            metadata: {
              sessionId,
              deviceFingerprint,
              isNewDevice,
              velocity: velocityResult,
            },
          },
        });
      } catch (logErr: unknown) {
        const isPrismaP2002 =
          typeof logErr === 'object' &&
          logErr !== null &&
          'code' in logErr &&
          (logErr as { code: string }).code === 'P2002';

        if (isPrismaP2002) {
          logger.info(
            { eventId },
            'Duplicate security audit log entry prevented by unique constraint'
          );
          return;
        }
        throw logErr;
      }

      logger.info(
        { eventId, userId, action, status },
        'Security telemetry processing complete'
      );
    },
    {
      connection: createBullMQConnection() as any,
      concurrency: auditWorkerConfig.concurrency,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message },
      `Anomaly worker job ${job?.id} failed`
    );
  });

  return worker;
};
