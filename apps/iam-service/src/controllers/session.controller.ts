import { BadRequestError, UnauthorizedError } from '@aegis/middlewares';
import type { NextFunction, Request, Response } from 'express';
import * as sessionService from '../services/session/session-management.service';

/**
 * Controller for retrieving all active sessions belonging to the authenticated user.
 *
 * @param req Express request containing validated internal token context
 * @param res Express response
 * @param next Next function callback
 */
export const listSessionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId || userId === 'anonymous') {
      throw new UnauthorizedError('User authentication required');
    }

    const currentSessionId = req.user?.sessionId;
    const sessions = await sessionService.listUserSessions(userId, currentSessionId);

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for revoking a single active session by its unique ID.
 *
 * @param req Express request containing session ID in params
 * @param res Express response
 * @param next Next function callback
 */
export const revokeSessionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId || userId === 'anonymous') {
      throw new UnauthorizedError('User authentication required');
    }

    const { sessionId } = req.params;
    if (!sessionId) {
      throw new BadRequestError('Session ID is required');
    }

    await sessionService.revokeSession(userId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for revoking all other active sessions except the currently active session.
 *
 * @param req Express request containing validated internal token context
 * @param res Express response
 * @param next Next function callback
 */
export const revokeAllOtherSessionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId || userId === 'anonymous') {
      throw new UnauthorizedError('User authentication required');
    }

    const currentSessionId = req.user?.sessionId;
    if (!currentSessionId) {
      throw new BadRequestError(
        'Current session ID could not be identified from authentication context'
      );
    }

    const revokedCount = await sessionService.revokeAllOtherSessions(
      userId,
      currentSessionId
    );

    res.status(200).json({
      success: true,
      message: `Successfully revoked ${revokedCount} other active session(s)`,
      revokedCount,
    });
  } catch (error) {
    next(error);
  }
};
