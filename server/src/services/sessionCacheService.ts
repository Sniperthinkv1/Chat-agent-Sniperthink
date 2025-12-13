import { cache } from '../utils/cacheManager';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { PhoneNumberType } from '../models/types';

/**
 * Normalize phone number to E.164 format with + prefix
 * Ensures consistent phone number format across all operations
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Session cache data structure
 */
export interface SessionData {
  conversationId: string;
  agentId: string;
  promptId: string;
  openaiConversationId: string | null;
  userId: string;
  accessToken: string;
  metaPhoneNumberId: string;
  platform: PhoneNumberType;
  customerPhone: string;
  phoneNumberId: string;
}

/**
 * Cache TTL configuration
 */
const SESSION_CACHE_TTL = 3600; // 1 hour
const SEQUENCE_CACHE_TTL = 86400; // 24 hours

/**
 * Redis key generators
 */
const getSessionKey = (phoneNumberId: string, customerPhone: string): string => 
  `session:${phoneNumberId}:${customerPhone}`;

const getSequenceKey = (conversationId: string): string => 
  `sequence:${conversationId}`;

/**
 * Get session data from cache or database
 * This is the main optimization - single query on cache miss
 */
export async function getOrCreateSession(
  phoneNumberId: string,
  customerPhone: string
): Promise<SessionData | null> {
  // Normalize phone number to ensure consistent format (E.164 with + prefix)
  const normalizedPhone = normalizePhoneNumber(customerPhone);
  const correlationId = `session-${phoneNumberId}-${normalizedPhone}-${Date.now()}`;
  const cacheKey = getSessionKey(phoneNumberId, normalizedPhone);

  try {
    // Try cache first
    let sessionData = await cache.getJSON<SessionData>(cacheKey);
    if (sessionData) {
      // Session cache hit
      return sessionData;
    }

    // Cache miss - query database with optimized single query
    sessionData = await fetchSessionFromDatabase(phoneNumberId, normalizedPhone);
    
    if (!sessionData) {
      logger.warn('No agent found for phone number', {
        correlationId,
        phoneNumberId
      });
      return null;
    }

    // Cache the result
    await cache.setJSON(cacheKey, sessionData, SESSION_CACHE_TTL);
    
    // OPTIMIZATION: Track this session key in a set for efficient invalidation
    const trackingKey = `session:tracking:${phoneNumberId}`;
    await cache.sAdd(trackingKey, cacheKey);
    await cache.expire(trackingKey, SESSION_CACHE_TTL);
    
    logger.info('Session created and cached', {
      correlationId,
      phoneNumberId,
      customerPhone: normalizedPhone,
      conversationId: sessionData.conversationId,
      agentId: sessionData.agentId
    });

    return sessionData;

  } catch (error) {
    logger.error('Failed to get or create session', {
      correlationId,
      phoneNumberId,
      customerPhone: normalizedPhone,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Fetch session data from database with single optimized query
 * Creates conversation if it doesn't exist
 */
async function fetchSessionFromDatabase(
  phoneNumberId: string,
  customerPhone: string
): Promise<SessionData | null> {
  const correlationId = `fetch-session-${phoneNumberId}-${customerPhone}`;

  try {
    // Single optimized query to get everything
    // Note: phoneNumberId parameter is actually meta_phone_number_id from webhook
    const query = `
      SELECT 
        a.agent_id,
        a.prompt_id,
        a.user_id,
        pn.access_token,
        pn.meta_phone_number_id,
        pn.platform,
        pn.id as phone_number_id,
        c.conversation_id,
        c.openai_conversation_id
      FROM agents a
      JOIN phone_numbers pn ON a.phone_number_id = pn.id
      LEFT JOIN conversations c ON c.agent_id = a.agent_id 
        AND c.customer_phone = $2 
        AND c.is_active = true
      WHERE pn.meta_phone_number_id = $1
      LIMIT 1
    `;

    const result = await db.query(query, [phoneNumberId, customerPhone]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // If conversation doesn't exist, create it (blocking - happens once per customer)
    let conversationId = row.conversation_id;
    let openaiConversationId = row.openai_conversation_id;

    if (!conversationId) {
      logger.info('Creating new conversation', {
        correlationId,
        agentId: row.agent_id,
        customerPhone
      });

      const createResult = await db.query(
        `INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at, is_active)
         VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
         RETURNING conversation_id, openai_conversation_id`,
        [row.agent_id, customerPhone]
      );

      conversationId = createResult.rows[0].conversation_id;
      openaiConversationId = createResult.rows[0].openai_conversation_id;

      logger.info('New conversation created', {
        correlationId,
        conversationId,
        agentId: row.agent_id,
        customerPhone
      });
    }

    return {
      conversationId,
      agentId: row.agent_id,
      promptId: row.prompt_id,
      openaiConversationId,
      userId: row.user_id,
      accessToken: row.access_token,
      metaPhoneNumberId: row.meta_phone_number_id,
      platform: row.platform,
      customerPhone,
      phoneNumberId: row.phone_number_id // Use the internal ID from database
    };

  } catch (error) {
    logger.error('Failed to fetch session from database', {
      correlationId,
      phoneNumberId,
      customerPhone,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get next sequence number from Redis (fast)
 * Syncs with DB if Redis counter doesn't exist
 */
export async function getNextSequenceNumber(conversationId: string): Promise<number> {
  const key = getSequenceKey(conversationId);
  
  try {
    // Check if sequence exists in cache
    const exists = await cache.exists(key);
    
    if (!exists) {
      // Sync with database to get current max sequence
      const result = await db.query(
        'SELECT COALESCE(MAX(sequence_no), 0) as max_seq FROM messages WHERE conversation_id = $1',
        [conversationId]
      );
      
      const maxSeq = result.rows[0]?.max_seq || 0;
      
      // Initialize cache counter with DB value
      if (maxSeq > 0) {
        await cache.set(key, maxSeq.toString(), SEQUENCE_CACHE_TTL);
      }
    }
    
    // Atomic increment - no race condition!
    const nextSeq = await cache.incr(key);
    
    // Refresh TTL
    await cache.expire(key, SEQUENCE_CACHE_TTL);
    
    return nextSeq;

  } catch (error) {
    logger.error('Failed to get next sequence number', {
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Update OpenAI conversation ID in session cache
 */
export async function updateOpenAIConversationId(
  phoneNumberId: string,
  customerPhone: string,
  openaiConversationId: string
): Promise<void> {
  const cacheKey = getSessionKey(phoneNumberId, customerPhone);

  try {
    const sessionData = await cache.getJSON<SessionData>(cacheKey);
    if (sessionData) {
      sessionData.openaiConversationId = openaiConversationId;
      await cache.setJSON(cacheKey, sessionData, SESSION_CACHE_TTL);
      
      // Cache updated
    }
  } catch (error) {
    logger.error('Failed to update OpenAI conversation ID in cache', {
      phoneNumberId,
      customerPhone,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Non-critical - don't throw
  }
}

/**
 * Invalidate session cache (manual cache clear)
 */
export async function invalidateSession(
  phoneNumberId: string,
  customerPhone: string
): Promise<void> {
  const cacheKey = getSessionKey(phoneNumberId, customerPhone);

  try {
    await cache.del(cacheKey);
    
    logger.info('Session cache invalidated', {
      phoneNumberId,
      customerPhone
    });

  } catch (error) {
    logger.error('Failed to invalidate session cache', {
      phoneNumberId,
      customerPhone,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Invalidate all sessions for a phone number (when agent config changes)
 * OPTIMIZED: Uses Redis Set tracking instead of keys() scan
 */
export async function invalidatePhoneNumberSessions(phoneNumberId: string): Promise<void> {
  try {
    // OPTIMIZATION: Get session keys from tracking set instead of scanning
    const trackingKey = `session:tracking:${phoneNumberId}`;
    const sessionKeys = await cache.sMembers(trackingKey);
    
    if (sessionKeys.length > 0) {
      // Delete all session keys
      for (const key of sessionKeys) {
        await cache.del(key);
      }
      // Clear the tracking set
      await cache.del(trackingKey);
      
      logger.info('Invalidated all sessions for phone number', {
        phoneNumberId,
        count: sessionKeys.length
      });
    } else {
      logger.debug('No sessions to invalidate for phone number', { phoneNumberId });
    }

  } catch (error) {
    logger.error('Failed to invalidate phone number sessions', {
      phoneNumberId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Invalidate all sessions for an agent (when agent is updated/deleted)
 */
export async function invalidateAgentSessions(agentId: string): Promise<void> {
  try {
    // Get phone_number_id for this agent
    const result = await db.query(
      'SELECT phone_number_id FROM agents WHERE agent_id = $1',
      [agentId]
    );

    if (result.rows.length > 0) {
      const phoneNumberId = result.rows[0].phone_number_id;
      await invalidatePhoneNumberSessions(phoneNumberId);
    }

  } catch (error) {
    logger.error('Failed to invalidate agent sessions', {
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
