import { Request, Response } from 'express';
import { 
  invalidateSession, 
  invalidatePhoneNumberSessions,
  invalidateAgentSessions 
} from '../services/sessionCacheService';
import { cache } from '../utils/cacheManager';
import { logger } from '../utils/logger';

/**
 * Invalidate session cache for specific phone number and customer
 * POST /api/cache/invalidate/session
 * Body: { phoneNumberId: string, customerPhone: string }
 */
export async function invalidateSessionCache(req: Request, res: Response): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string || `invalidate-${Date.now()}`;

  try {
    const { phoneNumberId, customerPhone } = req.body;

    if (!phoneNumberId || !customerPhone) {
      res.status(400).json({
        error: 'phoneNumberId and customerPhone are required',
        correlationId
      });
      return;
    }

    await invalidateSession(phoneNumberId, customerPhone);

    logger.info('Session cache invalidated', {
      correlationId,
      phoneNumberId,
      customerPhone
    });

    res.status(200).json({
      success: true,
      message: 'Session cache invalidated',
      correlationId
    });

  } catch (error) {
    logger.error('Failed to invalidate session cache', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to invalidate session cache',
      correlationId
    });
  }
}

/**
 * Invalidate all sessions for a phone number
 * POST /api/cache/invalidate/phone-number
 * Body: { phoneNumberId: string }
 */
export async function invalidatePhoneNumberCache(req: Request, res: Response): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string || `invalidate-${Date.now()}`;

  try {
    const { phoneNumberId } = req.body;

    if (!phoneNumberId) {
      res.status(400).json({
        error: 'phoneNumberId is required',
        correlationId
      });
      return;
    }

    await invalidatePhoneNumberSessions(phoneNumberId);

    logger.info('Phone number cache invalidated', {
      correlationId,
      phoneNumberId
    });

    res.status(200).json({
      success: true,
      message: 'Phone number cache invalidated',
      correlationId
    });

  } catch (error) {
    logger.error('Failed to invalidate phone number cache', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to invalidate phone number cache',
      correlationId
    });
  }
}

/**
 * Invalidate all sessions for an agent
 * POST /api/cache/invalidate/agent
 * Body: { agentId: string }
 */
export async function invalidateAgentCache(req: Request, res: Response): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string || `invalidate-${Date.now()}`;

  try {
    const { agentId } = req.body;

    if (!agentId) {
      res.status(400).json({
        error: 'agentId is required',
        correlationId
      });
      return;
    }

    await invalidateAgentSessions(agentId);

    logger.info('Agent cache invalidated', {
      correlationId,
      agentId
    });

    res.status(200).json({
      success: true,
      message: 'Agent cache invalidated',
      correlationId
    });

  } catch (error) {
    logger.error('Failed to invalidate agent cache', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to invalidate agent cache',
      correlationId
    });
  }
}

/**
 * Invalidate credits cache for a user
 * POST /api/cache/invalidate/credits
 * Body: { userId: string }
 */
export async function invalidateCreditsCache(req: Request, res: Response): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string || `invalidate-${Date.now()}`;

  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        error: 'userId is required',
        correlationId
      });
      return;
    }

    await cache.del(`credits:${userId}`);

    logger.info('Credits cache invalidated', {
      correlationId,
      userId
    });

    res.status(200).json({
      success: true,
      message: 'Credits cache invalidated',
      correlationId
    });

  } catch (error) {
    logger.error('Failed to invalidate credits cache', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to invalidate credits cache',
      correlationId
    });
  }
}

/**
 * Clear all cache (use with caution!)
 * POST /api/cache/clear-all
 * DISABLED: cache.keys() is too expensive for Upstash free tier
 */
export async function clearAllCache(req: Request, res: Response): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string || `clear-all-${Date.now()}`;

  logger.warn('Clear all cache disabled to conserve Redis operations', { correlationId });

  res.status(503).json({
    success: false,
    message: 'Clear all cache disabled to conserve Redis operations. Use specific cache clear endpoints instead.',
    correlationId
  });
}

/**
 * Get cache statistics
 * GET /api/cache/stats
 * DISABLED: cache.keys() is too expensive for Upstash free tier
 */
export async function getCacheStats(req: Request, res: Response): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string || `stats-${Date.now()}`;

  logger.debug('Cache stats disabled to conserve Redis operations', { correlationId });

  res.status(200).json({
    success: true,
    message: 'Cache stats disabled to conserve Redis operations',
    stats: {
      sessions: 0,
      credits: 0,
      sequences: 0,
      total: 0
    },
    correlationId
  });
}
