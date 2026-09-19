import { logger } from '@aegis/common';
import { auditPrisma } from '@aegis/database';
import { Request, Response } from 'express';
import { z } from 'zod';

const getLogsQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const getDevicesQuerySchema = z.object({
  userId: z.string().optional(),
});

const deleteDeviceParamsSchema = z.object({
  id: z.string().uuid('Invalid device identifier format'),
});

const deleteDeviceQuerySchema = z.object({
  userId: z.string().optional(),
});

/**
 * Controller handling security audit log queries and trusted device management.
 * Enforces strict runtime input validation using Zod schemas and prevents IDOR
 * by validating caller identity against the verified internal JWT claims.
 */
export class AuditController {
  /**
   * Retrieves paginated security audit logs for a specific user.
   */
  public async getLogs(req: Request, res: Response): Promise<void> {
    const parseResult = getLogsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const targetUserId = parseResult.data.userId || req.user?.sub;
    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID could not be determined' });
      return;
    }

    // IDOR Defense: Non-admin users cannot inspect other users' audit logs
    if (req.user && req.user.role !== 'ADMIN' && req.user.sub !== targetUserId) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions to view these audit logs' });
      return;
    }

    const { limit, offset } = parseResult.data;

    try {
      const [logs, total] = await Promise.all([
        auditPrisma.securityAuditLog.findMany({
          where: { userId: targetUserId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        auditPrisma.securityAuditLog.count({
          where: { userId: targetUserId },
        }),
      ]);

      res.status(200).json({ logs, total, limit, offset });
    } catch (err: unknown) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Failed to query security audit logs'
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Lists all trusted and recognized devices for a specific user.
   */
  public async getDevices(req: Request, res: Response): Promise<void> {
    const parseResult = getDevicesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const targetUserId = parseResult.data.userId || req.user?.sub;
    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID could not be determined' });
      return;
    }

    // IDOR Defense: Non-admin users cannot inspect other users' devices
    if (req.user && req.user.role !== 'ADMIN' && req.user.sub !== targetUserId) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions to view these devices' });
      return;
    }

    try {
      const devices = await auditPrisma.trustedDevice.findMany({
        where: { userId: targetUserId },
        orderBy: { lastSeenAt: 'desc' },
      });

      res.status(200).json({ devices });
    } catch (err: unknown) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Failed to query trusted devices'
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Deletes a trusted device record by ID with user ownership validation.
   */
  public async deleteDevice(req: Request, res: Response): Promise<void> {
    const paramsResult = deleteDeviceParamsSchema.safeParse(req.params);
    const queryResult = deleteDeviceQuerySchema.safeParse(req.query);

    if (!paramsResult.success || !queryResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: {
          ...paramsResult.error?.flatten().fieldErrors,
          ...queryResult.error?.flatten().fieldErrors,
        },
      });
      return;
    }

    const { id } = paramsResult.data;
    const targetUserId = queryResult.data.userId || req.user?.sub;
    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID could not be determined' });
      return;
    }

    // IDOR Defense: Non-admin users cannot delete other users' devices
    if (req.user && req.user.role !== 'ADMIN' && req.user.sub !== targetUserId) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions to delete this device' });
      return;
    }

    try {
      const device = await auditPrisma.trustedDevice.findFirst({
        where: { id, userId: targetUserId },
      });

      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      await auditPrisma.trustedDevice.delete({
        where: { id },
      });

      res.status(200).json({ success: true });
    } catch (err: unknown) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Failed to delete trusted device'
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const auditController = new AuditController();
