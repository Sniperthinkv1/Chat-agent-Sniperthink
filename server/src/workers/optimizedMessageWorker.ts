import { messageQueue } from '../utils/messageQueue';
import { lockManager } from '../utils/lockManager';
import { callOpenAI, getOrCreateOpenAIConversation } from '../services/openaiService';
import { sendMessage, sendTypingIndicator } from '../services/messageService';
import { hasEnoughCredits } from '../services/creditService';
import { logger } from '../utils/logger';
import { sseManager } from '../utils/sseManager';
import { PhoneNumberType } from '../models/types';
import {
  getOrCreateSession,
  getNextSequenceNumber,
  updateOpenAIConversationId
} from '../services/sessionCacheService';
import {
  storeIncomingMessageAsync,
  storeOutgoingMessageAsync,
  trackDeliveryAsync,
  updateConversationActivityAsync,
  deductCreditsAsync
} from '../services/asyncStorageService';
import { ConversationModel } from '../models/Conversation';
import { db } from '../utils/database';
import { rateLimitConfig } from '../config';

/**
 * Detect meeting booking action in OpenAI response
 * Looks for JSON with action: "Time_to_121meet"
 * Returns: { meetingData: object, cleanedResponse: string }
 */
function detectMeetingBookingAction(response: string): { meetingData: any | null; cleanedResponse: string } {
  try {
    // Look for JSON object or array in the response
    // Try array first: [{"action": "Time_to_121meet", ...}]
    let jsonMatch = response.match(/\[?\s*\{[^}]*"action"\s*:\s*"Time_to_121meet"[^}]*\}[^\]]*\]?/s);
    
    if (!jsonMatch) {
      return { meetingData: null, cleanedResponse: response };
    }

    const jsonString = jsonMatch[0];
    let parsed = JSON.parse(jsonString);
    
    // If it's an array, get the first item
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    
    // Check if it has the meeting action
    if (parsed && parsed.action === 'Time_to_121meet') {
      // Remove the JSON from the response
      const cleanedResponse = response.replace(jsonString, '').trim();
      
      return {
        meetingData: parsed,
        cleanedResponse: cleanedResponse || 'Let me schedule that meeting for you...'
      };
    }

    return { meetingData: null, cleanedResponse: response };
  } catch (error) {
    // Not valid JSON or doesn't match expected format
    return { meetingData: null, cleanedResponse: response };
  }
}

/**
 * Optimized message worker with Redis caching and async storage
 * Target: <5.1s total latency (down from 7.7s)
 */
export async function processMessageOptimized(workerId: string): Promise<void> {
  const startTime = Date.now();
  let lock: any = null;
  let phoneNumberId: string | undefined;
  let dequeuedMessage: any = null;

  try {
    // Step 1: Dequeue message from in-memory queue (instant!)
    dequeuedMessage = await messageQueue.dequeue();

    if (!dequeuedMessage) {
      return; // No messages in queue
    }

    const { message, lease } = dequeuedMessage;
    phoneNumberId = message.phone_number_id;
    const customerPhone = message.customer_phone;
    const messageText = message.message_text;
    const messageId = message.message_id;
    const platformType = message.platform_type as PhoneNumberType;

    const correlationId = `process-${messageId}`;

    // Validate required fields
    if (!phoneNumberId || !customerPhone) {
      logger.error('Invalid message: missing required fields', {
        correlationId,
        messageId,
        hasPhoneNumberId: !!phoneNumberId,
        hasCustomerPhone: !!customerPhone
      });
      await messageQueue.fail(lease, 'Invalid message format', false);
      return;
    }

    logger.info('Processing message (optimized)', {
      correlationId,
      messageId,
      phoneNumberId,
      customerPhone,
      platformType,
      workerId
    });

    // Step 2: Acquire distributed lock per customer conversation
    // Lock on customer phone to ensure FIFO ordering per customer
    const lockResource = `customer:${phoneNumberId}:${customerPhone}`;

    lock = await lockManager.acquireLock(lockResource, 300000, 150);

    if (!lock) {
      // Failed to acquire lock - fail the message for retry
      await messageQueue.fail(lease, 'Failed to acquire lock', true);
      logger.warn('Failed to acquire lock, message will be retried', {
        correlationId,
        phoneNumberId,
        messageId
      });
      return;
    }

    // Step 3: Get session from cache (5ms cache hit, 120ms cache miss)
    const sessionStart = Date.now();
    const session = await getOrCreateSession(phoneNumberId, customerPhone);
    const sessionTime = Date.now() - sessionStart;

    if (!session) {
      logger.error('No agent found for phone number', {
        correlationId,
        phoneNumberId
      });
      return;
    }

    // Session retrieved successfully

    // Step 3.5: Send typing indicator + read receipt IMMEDIATELY (async, non-blocking)
    // This shows "typing..." AND marks message as read (double blue checkmarks)
    // Fire and forget - don't wait for response
    sendTypingIndicator(
      session.phoneNumberId,
      customerPhone,
      platformType,
      messageId,  // Pass the incoming message ID
      session.accessToken,
      session.metaPhoneNumberId
    );

    logger.info('Typing indicator + read receipt triggered (async)', {
      correlationId,
      phoneNumberId,
      customerPhone,
      platformType,
      messageId
    });

    // Step 4: Check credits from Redis cache (~5ms)
    const creditsStart = Date.now();
    const hasCredits = await hasEnoughCredits(session.userId, 1);
    const creditsTime = Date.now() - creditsStart;

    if (!hasCredits) {
      logger.warn('Insufficient credits', {
        correlationId,
        userId: session.userId
      });
      return;
    }

    // Credits checked successfully

    // Step 5: Get sequence numbers for both messages (~10ms total)
    // IMPORTANT: Must be sequential to ensure atomic INCR works correctly
    const incomingSeq = await getNextSequenceNumber(session.conversationId);
    const outgoingSeq = await getNextSequenceNumber(session.conversationId);

    // Step 6: Store incoming message ASYNC (non-blocking)
    // Note: This happens in background, doesn't block OpenAI call
    storeIncomingMessageAsync(messageId, session.conversationId, messageText, incomingSeq);

    // Step 7: Ensure OpenAI conversation exists
    let openaiConversationId = session.openaiConversationId;

    if (!openaiConversationId) {
      const conversationModel = new ConversationModel(db as any);
      openaiConversationId = await getOrCreateOpenAIConversation(
        session.conversationId,
        session.openaiConversationId || undefined
      );

      // Update in database
      await conversationModel.updateOpenAIConversationId(
        session.conversationId,
        openaiConversationId
      );

      // Update cache
      await updateOpenAIConversationId(
        phoneNumberId,
        customerPhone,
        openaiConversationId
      );
    }

    // Step 8: Call OpenAI API with exponential backoff (~4900ms - can't optimize)
    const openaiStart = Date.now();
    let openaiResult = await callOpenAI(
      messageText,
      openaiConversationId,
      session.promptId,
      session.userId
    );
    const openaiTime = Date.now() - openaiStart;

    // Handle rate limit with exponential backoff
    if (!openaiResult.success && openaiResult.errorCode === 'rate_limit_exceeded' && rateLimitConfig.retryEnabled) {
      logger.warn('OpenAI rate limit hit, starting exponential backoff', {
        correlationId,
        retryDelays: rateLimitConfig.retryDelays
      });

      // Send initial "server busy" message to customer
      await sendMessage(
        session.phoneNumberId,
        customerPhone,
        rateLimitConfig.initialMessage,
        platformType,
        session.accessToken,
        session.metaPhoneNumberId
      );

      // Try with exponential backoff
      for (let i = 0; i < rateLimitConfig.retryDelays.length; i++) {
        const delay = rateLimitConfig.retryDelays[i];
        logger.info('Waiting before retry', {
          correlationId,
          attempt: i + 1,
          delayMs: delay
        });

        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry OpenAI call
        logger.info('Retrying OpenAI call', {
          correlationId,
          attempt: i + 1
        });

        openaiResult = await callOpenAI(
          messageText,
          openaiConversationId,
          session.promptId,
          session.userId
        );

        // If successful, break out of retry loop
        if (openaiResult.success && openaiResult.response) {
          logger.info('OpenAI retry successful', {
            correlationId,
            attempt: i + 1
          });
          break;
        }

        // If still rate limited, continue to next retry
        if (openaiResult.errorCode === 'rate_limit_exceeded') {
          logger.warn('Still rate limited after retry', {
            correlationId,
            attempt: i + 1
          });
          continue;
        }

        // If different error, break out
        logger.error('OpenAI retry failed with different error', {
          correlationId,
          attempt: i + 1,
          error: openaiResult.error,
          errorCode: openaiResult.errorCode
        });
        break;
      }

      // If still failed after all retries, send final message
      if (!openaiResult.success || !openaiResult.response) {
        logger.error('OpenAI call failed after all retries', {
          correlationId,
          error: openaiResult.error,
          errorCode: openaiResult.errorCode,
          totalRetries: rateLimitConfig.retryDelays.length
        });

        // Send final "please try later" message
        await sendMessage(
          session.phoneNumberId,
          customerPhone,
          rateLimitConfig.finalMessage,
          platformType,
          session.accessToken,
          session.metaPhoneNumberId
        );

        return;
      }
    } else if (!openaiResult.success || !openaiResult.response) {
      // Non-rate-limit error, fail immediately
      logger.error('OpenAI call failed', {
        correlationId,
        error: openaiResult.error,
        errorCode: openaiResult.errorCode
      });
      return;
    }

    const aiResponse = openaiResult.response;

    logger.info('OpenAI response received', {
      correlationId,
      openaiTime,
      responseLength: aiResponse.length,
      tokensUsed: openaiResult.tokensUsed
    });

    // Step 8.5: Check for meeting booking action in OpenAI response
    let meetingBookingResult: any = null;
    let responseToSend = aiResponse;
    
    try {
      const { meetingData, cleanedResponse } = detectMeetingBookingAction(aiResponse);
      
      if (meetingData) {
        logger.info('Meeting booking action detected', {
          correlationId,
          conversationId: session.conversationId,
          meetingData
        });

        // Use cleaned response (without JSON)
        responseToSend = cleanedResponse;

        // Book meeting asynchronously (don't block response)
        const { bookMeetingFromOpenAI } = await import('../services/meetingService');
        meetingBookingResult = await bookMeetingFromOpenAI(
          session.conversationId,
          meetingData
        );

        logger.info('Meeting booking result', {
          correlationId,
          success: meetingBookingResult.success,
          meetingId: meetingBookingResult.meeting_id,
          meetLink: meetingBookingResult.meet_link
        });
      }
    } catch (error) {
      logger.error('Failed to process meeting booking', {
        correlationId,
        error: (error as Error).message
      });
    }

    // Step 9: Send response IMMEDIATELY (~50ms)
    // Use session.phoneNumberId (internal DB ID), not phoneNumberId (meta ID)
    // Pass access token from session to avoid DB query (optimization)
    const sendStart = Date.now();
    
    // Determine what message to send
    let messageToSend = responseToSend;
    
    // If meeting booking failed, send error message
    if (meetingBookingResult && !meetingBookingResult.success) {
      messageToSend = meetingBookingResult.message || responseToSend;
    }
    // If meeting booking succeeded, send confirmation with Meet link
    else if (meetingBookingResult && meetingBookingResult.success && meetingBookingResult.meet_link) {
      messageToSend = `${responseToSend}\n\n✅ Meeting confirmed!\n\n📅 ${meetingBookingResult.message}\n🔗 Join here: ${meetingBookingResult.meet_link}\n\nYou'll receive a calendar invite via email.`;
    }
    
    const sendResult = await sendMessage(
      session.phoneNumberId,
      customerPhone,
      messageToSend,
      platformType,
      session.accessToken,        // Pass cached access token
      session.metaPhoneNumberId   // Pass cached meta phone number ID
    );
    const sendTime = Date.now() - sendStart;

    if (!sendResult.success) {
      logger.error('Failed to send message', {
        correlationId,
        error: sendResult.error,
        errorCode: sendResult.errorCode
      });
      return;
    }

    logger.info('Response sent to user', {
      correlationId,
      sendTime,
      platformMessageId: sendResult.messageId,
      meetingBooked: !!meetingBookingResult?.success
    });

    // Step 9.5: Push message via SSE for webchat (real-time delivery)
    if (platformType === 'webchat') {
      const outgoingMsgId = `out-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const pushed = sseManager.sendMessage(customerPhone, session.metaPhoneNumberId, {
        message_id: outgoingMsgId,
        message_text: aiResponse,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        conversation_id: session.conversationId
      });
      
      if (pushed) {
        logger.info('Message pushed via SSE', {
          correlationId,
          session_id: customerPhone,
          webchat_id: session.metaPhoneNumberId
        });
      }
    }

    // Step 10: Store everything ASYNC (non-blocking, user already got response!)
    const outgoingMessageId = `out-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Store message with platform_message_id so webhook status updates can find it
    // This fixes the FK constraint error when WhatsApp sends delivery status updates
    storeOutgoingMessageAsync(
      outgoingMessageId, 
      session.conversationId, 
      aiResponse, 
      outgoingSeq,
      sendResult.messageId  // Pass WhatsApp message ID so status webhooks can find this message
    ).then(() => {
      // Track delivery status after message is stored
      trackDeliveryAsync(outgoingMessageId, sendResult.messageId!, 'sent');
    });

    // These can run in parallel
    updateConversationActivityAsync(session.conversationId);
    deductCreditsAsync(session.userId, 1);

    // Complete message processing
    await messageQueue.complete(lease);

    // Calculate total time
    const totalTime = Date.now() - startTime;

    logger.info('Message processed successfully (optimized)', {
      correlationId,
      messageId,
      conversationId: session.conversationId,
      totalTime,
      breakdown: {
        session: sessionTime,
        credits: creditsTime,
        openai: openaiTime,
        send: sendTime
      },
      tokensUsed: openaiResult.tokensUsed,
      workerId
    });

  } catch (error) {
    logger.error('Message processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      workerId
    });
    
    // Fail the message if we have a lease
    if (dequeuedMessage) {
      await messageQueue.fail(dequeuedMessage.lease, error instanceof Error ? error.message : 'Unknown error', true);
    }
  } finally {
    // Release lock
    if (lock) {
      try {
        await lockManager.releaseLock(lock);
      } catch (error) {
        logger.error('Failed to release lock', {
          phoneNumberId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}

/**
 * Start optimized message worker with event-driven processing
 * No polling! Workers listen for message events
 */
export async function startOptimizedMessageWorker(workerId: string): Promise<void> {
  logger.info('Starting event-driven message worker', { workerId });

  // Concurrency limit per worker
  const concurrency = parseInt(process.env['WORKER_CONCURRENCY'] || '10', 10);
  const activePromises = new Set<Promise<void>>();

  logger.info('Worker configured for event-driven processing', {
    workerId,
    concurrency,
    mode: 'event-driven (zero polling!)'
  });

  // Listen for message events
  messageQueue.onMessage(async () => {
    // Only process if under concurrency limit
    if (activePromises.size >= concurrency) {
      return; // Another worker will pick it up
    }

    // Start processing message
    const messagePromise = processMessageOptimized(workerId)
      .catch(error => {
        logger.error('Message processing error', {
          workerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      })
      .finally(() => {
        activePromises.delete(messagePromise);
      });

    activePromises.add(messagePromise);
  });

  // Keep worker alive
  logger.info('Worker ready and listening for messages', { workerId });
  
  // Graceful shutdown handler (use once to avoid duplicate listeners)
  process.once('SIGTERM', async () => {
    logger.info('Worker shutting down gracefully', { workerId });
    // Wait for active messages to complete
    await Promise.all(Array.from(activePromises));
    logger.info('Worker shutdown complete', { workerId });
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {}); // Never resolves
}
