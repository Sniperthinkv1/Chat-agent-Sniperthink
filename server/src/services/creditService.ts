import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { cache } from '../utils/cacheManager';
import { Credits, UpdateCreditsData } from '../models/types';

// Redis cache TTL for credit balances (5 minutes)
const CREDIT_CACHE_TTL = 300;

// Redis key prefix for credit cache
const getCreditCacheKey = (userId: string): string => `credits:${userId}`;

/**
 * Get user's remaining credits with Redis caching
 * Uses cache-aside pattern: check cache first, fallback to database
 */
export async function getUserCredits(userId: string): Promise<number> {
    const correlationId = `get-credits-${userId}`;
    const cacheKey = getCreditCacheKey(userId);
    
    try {
        // Try to get from cache first
        const cachedCredits = await cache.get(cacheKey);
        if (cachedCredits !== null) {
            const credits = parseInt(cachedCredits, 10);
            logger.debug('Retrieved user credits from cache', { 
                correlationId, 
                userId, 
                credits 
            });
            return credits;
        }

        // Cache miss - query database
        const query = 'SELECT remaining_credits FROM credits WHERE user_id = $1';
        const result = await db.query(query, [userId]);
        
        if (result.rows.length === 0) {
            // User not found in credits table, cache 0 to avoid repeated DB queries
            await cache.set(cacheKey, '0', CREDIT_CACHE_TTL);
            logger.warn('User not found in credits table', { correlationId, userId });
            return 0;
        }

        const credits = result.rows[0].remaining_credits;
        
        // Cache the result
        await cache.set(cacheKey, credits.toString(), CREDIT_CACHE_TTL);
        
        logger.debug('Retrieved user credits from database and cached', { 
            correlationId, 
            userId, 
            credits 
        });

        return credits;

    } catch (error) {
        logger.error('Failed to get user credits', {
            correlationId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Check if user has sufficient credits for processing
 * Returns true if user has enough credits, false otherwise
 */
export async function hasEnoughCredits(userId: string, requiredAmount: number = 1): Promise<boolean> {
    const correlationId = `check-credits-${userId}`;
    
    try {
        const currentCredits = await getUserCredits(userId);
        const hasEnough = currentCredits >= requiredAmount;
        
        logger.debug('Credit check completed', {
            correlationId,
            userId,
            currentCredits,
            requiredAmount,
            hasEnough
        });

        return hasEnough;

    } catch (error) {
        logger.error('Failed to check credits', {
            correlationId,
            userId,
            requiredAmount,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Deduct credits from user's balance atomically
 * Uses database-level atomic operation to prevent race conditions
 * Invalidates cache after successful deduction
 */
export async function deductCredits(userId: string, amount: number): Promise<number> {
    const correlationId = `deduct-credits-${userId}`;
    const cacheKey = getCreditCacheKey(userId);
    
    try {
        // Atomic credit deduction with check in single query
        const query = `
            UPDATE credits 
            SET remaining_credits = remaining_credits - $1,
                last_updated = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND remaining_credits >= $1
            RETURNING remaining_credits
        `;
        
        const result = await db.query(query, [amount, userId]);
        
        if (result.rows.length === 0) {
            logger.warn('Credit deduction failed - insufficient credits or user not found', {
                correlationId,
                userId,
                amount
            });
            throw new InsufficientCreditsError('Insufficient credits or user not found');
        }

        const newBalance = result.rows[0].remaining_credits;
        
        // Invalidate cache to ensure fresh data on next read
        await cache.del(cacheKey);
        
        logger.info('Credits deducted successfully', {
            correlationId,
            userId,
            amount,
            newBalance
        });

        return newBalance;

    } catch (error) {
        if (error instanceof InsufficientCreditsError) {
            throw error;
        }
        
        logger.error('Failed to deduct credits', {
            correlationId,
            userId,
            amount,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Custom error class for insufficient credits
 */
export class InsufficientCreditsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InsufficientCreditsError';
    }
}

/**
 * Add credits to user's balance
 * Invalidates cache after successful addition
 */
export async function addCredits(userId: string, amount: number): Promise<number> {
    const correlationId = `add-credits-${userId}`;
    const cacheKey = getCreditCacheKey(userId);
    
    try {
        const query = `
            INSERT INTO credits (user_id, remaining_credits, last_updated)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET 
                remaining_credits = credits.remaining_credits + $2,
                last_updated = CURRENT_TIMESTAMP
            RETURNING remaining_credits
        `;
        
        const result = await db.query(query, [userId, amount]);
        const newBalance = result.rows[0].remaining_credits;
        
        // Invalidate cache to ensure fresh data on next read
        await cache.del(cacheKey);
        
        logger.info('Credits added successfully', {
            correlationId,
            userId,
            amount,
            newBalance
        });

        return newBalance;

    } catch (error) {
        logger.error('Failed to add credits', {
            correlationId,
            userId,
            amount,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Get credit balance and usage statistics
 */
export async function getCreditStats(userId: string): Promise<Credits | null> {
    const correlationId = `get-credit-stats-${userId}`;
    
    try {
        const query = 'SELECT * FROM credits WHERE user_id = $1';
        const result = await db.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const credits: Credits = {
            user_id: result.rows[0].user_id,
            remaining_credits: result.rows[0].remaining_credits,
            last_updated: result.rows[0].last_updated
        };

        logger.debug('Retrieved credit stats', { 
            correlationId, 
            userId,
            credits: credits.remaining_credits
        });

        return credits;

    } catch (error) {
        logger.error('Failed to get credit stats', {
            correlationId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Update user's credit balance (admin function)
 * Sets absolute credit value and invalidates cache
 */
export async function updateCredits(userId: string, data: UpdateCreditsData): Promise<Credits> {
    const correlationId = `update-credits-${userId}`;
    const cacheKey = getCreditCacheKey(userId);
    
    try {
        const query = `
            INSERT INTO credits (user_id, remaining_credits, last_updated)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET 
                remaining_credits = $2,
                last_updated = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const result = await db.query(query, [userId, data.remaining_credits]);
        
        const credits: Credits = {
            user_id: result.rows[0].user_id,
            remaining_credits: result.rows[0].remaining_credits,
            last_updated: result.rows[0].last_updated
        };

        // Invalidate cache to ensure fresh data on next read
        await cache.del(cacheKey);

        logger.info('Credits updated successfully', {
            correlationId,
            userId,
            newBalance: credits.remaining_credits
        });

        return credits;

    } catch (error) {
        logger.error('Failed to update credits', {
            correlationId,
            userId,
            data,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Log credit usage for audit trail
 * Records credit deduction events for monitoring and reporting
 */
export async function logCreditUsage(
    userId: string, 
    amount: number, 
    operation: 'deduct' | 'add' | 'update',
    metadata?: Record<string, any>
): Promise<void> {
    const correlationId = `log-credit-usage-${userId}`;
    
    try {
        logger.info('Credit usage logged', {
            correlationId,
            userId,
            amount,
            operation,
            metadata,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Non-critical operation - log error but don't throw
        logger.error('Failed to log credit usage', {
            correlationId,
            userId,
            amount,
            operation,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
