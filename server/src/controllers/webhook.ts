import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { enqueueMessage } from '../utils/messageQueue';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for processed webhook message (matches QueuedMessage)
 */
interface ProcessedMessage {
    message_id: string;
    phone_number_id: string;
    customer_phone: string;
    message_text: string;
    timestamp: string;
    platform_type: 'whatsapp' | 'instagram' | 'webchat';
}

/**
 * WhatsApp webhook payload interfaces
 */
interface WhatsAppWebhookPayload {
    object: 'whatsapp_business_account';
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: 'whatsapp';
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: { name: string };
                    wa_id: string;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts';
                    text?: { body: string };
                    image?: { mime_type: string; sha256: string; id: string };
                    audio?: { mime_type: string; sha256: string; id: string; voice: boolean };
                    video?: { mime_type: string; sha256: string; id: string };
                    document?: { mime_type: string; sha256: string; id: string; filename: string };
                    location?: { latitude: number; longitude: number; name?: string; address?: string };
                    contacts?: Array<any>;
                }>;
                statuses?: Array<{
                    id: string;
                    status: 'sent' | 'delivered' | 'read' | 'failed';
                    timestamp: string;
                    recipient_id: string;
                    errors?: Array<{ code: number; title: string; message: string }>;
                }>;
            };
            field: 'messages';
        }>;
    }>;
}

/**
 * Instagram webhook payload interfaces
 * Instagram can send messages in two formats:
 * 1. Messaging format (older): entry[].messaging[]
 * 2. Changes format (newer): entry[].changes[].value with sender/recipient at root
 */
interface InstagramWebhookPayload {
    object: 'instagram';
    entry: Array<{
        id: string;
        time: number;
        // Format 1: Messaging array (older format)
        messaging?: Array<{
            sender: { id: string };
            recipient: { id: string };
            timestamp: number;
            message?: {
                mid: string;
                text?: string;
                attachments?: Array<{
                    type: 'image' | 'video' | 'audio' | 'file';
                    payload: { url: string };
                }>;
            };
            postback?: {
                payload: string;
                title: string;
            };
        }>;
        // Format 2: Changes array (newer format)
        changes?: Array<{
            field: string;
            value: {
                sender?: { id: string };
                recipient?: { id: string };
                timestamp?: string | number;
                message?: {
                    mid: string;
                    text?: string;
                    attachments?: Array<{
                        type: 'image' | 'video' | 'audio' | 'file';
                        payload: { url: string };
                    }>;
                };
                postback?: {
                    payload: string;
                    title: string;
                };
            };
        }>;
    }>;
}

/**
 * Handle Meta webhook POST requests (WhatsApp and Instagram)
 */
export async function handleMetaWebhook(req: Request, res: Response): Promise<void> {
    const correlationId = req.get('x-correlation-id') || 'unknown';
    
    try {
        const payload = req.body;
        
        // DEBUG: Log the entire payload to see what Instagram is sending
        logger.info('📥 Webhook payload received', {
            payload: JSON.stringify(payload, null, 2),
            correlationId
        });
        
        if (!payload || !payload.object) {
            logger.warn('Invalid webhook payload structure', { correlationId });
            res.status(400).json({
                error: 'Invalid payload structure',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Process based on platform type
        let processedMessages: ProcessedMessage[] = [];
        
        if (payload.object === 'whatsapp_business_account') {
            processedMessages = parseWhatsAppPayload(payload as WhatsAppWebhookPayload, correlationId);
        } else if (payload.object === 'instagram') {
            processedMessages = parseInstagramPayload(payload as InstagramWebhookPayload, correlationId);
        } else {
            logger.warn('Unsupported webhook object type', { 
                object: payload.object, 
                correlationId 
            });
            res.status(400).json({
                error: 'Unsupported webhook object type',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Enqueue messages for processing
        const enqueuePromises = processedMessages.map(message => 
            enqueueMessage(message).catch(error => {
                logger.error('Failed to enqueue message', {
                    message_id: message.message_id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    correlationId
                });
                return null;
            })
        );

        const results = await Promise.allSettled(enqueuePromises);
        const successCount = results.filter(result => result.status === 'fulfilled' && result.value !== null).length;
        const failureCount = results.length - successCount;

        if (failureCount > 0) {
            logger.warn('Some messages failed to enqueue', {
                totalMessages: processedMessages.length,
                successCount,
                failureCount,
                correlationId
            });
        }

        logger.info('Webhook processed successfully', {
            platform: payload.object,
            messagesProcessed: processedMessages.length,
            successCount,
            failureCount,
            correlationId
        });

        // Always return 200 to Meta to acknowledge receipt
        res.status(200).json({
            status: 'received',
            messagesProcessed: processedMessages.length,
            correlationId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error processing webhook', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            correlationId
        });

        // Still return 200 to prevent Meta from retrying
        res.status(200).json({
            status: 'error',
            error: 'Internal processing error',
            correlationId,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Parse WhatsApp webhook payload and extract messages
 */
function parseWhatsAppPayload(payload: WhatsAppWebhookPayload, correlationId: string): ProcessedMessage[] {
    const messages: ProcessedMessage[] = [];

    try {
        for (const entry of payload.entry) {
            for (const change of entry.changes) {
                if (change.field !== 'messages' || !change.value.messages) {
                    continue;
                }

                const { metadata } = change.value;
                const phoneNumberId = metadata.phone_number_id;

                for (const message of change.value.messages) {
                    let messageText = '';

                    // Extract text based on message type
                    switch (message.type) {
                        case 'text':
                            messageText = message.text?.body || '';
                            break;
                        case 'image':
                            messageText = '[Image received]';
                            break;
                        case 'audio':
                            messageText = message.audio?.voice ? '[Voice message]' : '[Audio file]';
                            break;
                        case 'video':
                            messageText = '[Video received]';
                            break;
                        case 'document':
                            messageText = `[Document: ${message.document?.filename || 'Unknown'}]`;
                            break;
                        case 'location':
                            messageText = `[Location: ${message.location?.name || 'Shared location'}]`;
                            break;
                        case 'contacts':
                            messageText = '[Contact shared]';
                            break;
                        default:
                            messageText = `[Unsupported message type: ${message.type}]`;
                    }

                    if (messageText) {
                        messages.push({
                            message_id: message.id,
                            phone_number_id: phoneNumberId,
                            customer_phone: message.from,
                            message_text: messageText,
                            timestamp: message.timestamp,
                            platform_type: 'whatsapp'
                        });

                        // Message parsed
                    }
                }
            }
        }
    } catch (error) {
        logger.error('Error parsing WhatsApp payload', {
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId
        });
    }

    return messages;
}

/**
 * Parse Instagram webhook payload and extract messages
 * Supports both messaging format and changes format
 */
function parseInstagramPayload(payload: InstagramWebhookPayload, correlationId: string): ProcessedMessage[] {
    const messages: ProcessedMessage[] = [];

    try {
        logger.info('📱 Parsing Instagram payload', {
            entryCount: payload.entry?.length || 0,
            correlationId
        });

        for (const entry of payload.entry) {
            const businessAccountId = entry.id;

            logger.info('📨 Processing Instagram entry', {
                entryId: entry.id,
                hasMessaging: !!entry.messaging,
                hasChanges: !!entry.changes,
                messagingCount: entry.messaging?.length || 0,
                changesCount: entry.changes?.length || 0,
                correlationId
            });

            // Format 1: Messaging array (older format)
            if (entry.messaging && entry.messaging.length > 0) {
                for (const messaging of entry.messaging) {
                    const parsedMessage = parseInstagramMessagingEvent(
                        messaging,
                        businessAccountId,
                        correlationId
                    );
                    if (parsedMessage) {
                        messages.push(parsedMessage);
                    }
                }
            }

            // Format 2: Changes array (newer format)
            if (entry.changes && entry.changes.length > 0) {
                for (const change of entry.changes) {
                    if (change.field === 'messages' && change.value) {
                        const parsedMessage = parseInstagramChangeEvent(
                            change.value,
                            businessAccountId,
                            correlationId
                        );
                        if (parsedMessage) {
                            messages.push(parsedMessage);
                        }
                    }
                }
            }

            // If neither format found, log warning
            if (!entry.messaging && !entry.changes) {
                logger.warn('⚠️ Instagram entry has neither messaging nor changes array', { 
                    entryId: entry.id,
                    entryKeys: Object.keys(entry),
                    correlationId 
                });
            }
        }
    } catch (error) {
        logger.error('Error parsing Instagram payload', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            correlationId
        });
    }

    return messages;
}

/**
 * Parse Instagram messaging event (older format)
 */
function parseInstagramMessagingEvent(
    messaging: any,
    businessAccountId: string,
    correlationId: string
): ProcessedMessage | null {
    try {
        // Log what fields are present in the messaging object
        logger.info('🔍 Instagram messaging event fields', {
            hasMessage: !!messaging.message,
            hasMessageEdit: !!messaging.message_edit,
            hasPostback: !!messaging.postback,
            hasSender: !!messaging.sender,
            hasRecipient: !!messaging.recipient,
            allKeys: Object.keys(messaging),
            correlationId
        });

        let messageText = '';
        let messageId = '';
        let senderId = '';

        // Handle regular message
        if (messaging.message) {
            // Skip echo messages (messages sent by the bot itself)
            if (messaging.message.is_echo) {
                logger.debug('Skipping echo message', {
                    messageId: messaging.message.mid,
                    correlationId
                });
                return null;
            }

            messageId = messaging.message.mid;
            senderId = messaging.sender?.id || '';
            
            if (messaging.message.text) {
                messageText = messaging.message.text;
            } else if (messaging.message.attachments && messaging.message.attachments.length > 0) {
                const attachment = messaging.message.attachments[0];
                if (attachment) {
                    messageText = `[${attachment.type.charAt(0).toUpperCase() + attachment.type.slice(1)} received]`;
                }
            }
        } 
        // Handle message edit (Instagram sometimes sends edits for new messages)
        else if (messaging.message_edit) {
            messageId = messaging.message_edit.mid;
            senderId = messaging.sender?.id || '';
            // For edits, we need to fetch the actual message content
            // For now, just acknowledge it was edited
            messageText = '[Message edited - content not available in webhook]';
            
            logger.warn('⚠️ Received message_edit event', {
                messageId,
                numEdit: messaging.message_edit.num_edit,
                senderId,
                correlationId
            });
        }
        // Handle postback
        else if (messaging.postback) {
            messageId = uuidv4();
            senderId = messaging.sender?.id || '';
            messageText = messaging.postback.title || messaging.postback.payload;
        }

        if (messageText && messageId && senderId) {
            logger.info('✅ Instagram message parsed (messaging format)', {
                messageId,
                phoneNumberId: businessAccountId,
                customerPhone: senderId,
                messageText: messageText.substring(0, 50),
                correlationId
            });

            return {
                message_id: messageId,
                phone_number_id: businessAccountId,
                customer_phone: senderId,
                message_text: messageText,
                timestamp: messaging.timestamp.toString(),
                platform_type: 'instagram'
            };
        }

        logger.warn('⚠️ Could not parse Instagram messaging event', {
            hasMessage: !!messaging.message,
            hasMessageEdit: !!messaging.message_edit,
            hasPostback: !!messaging.postback,
            hasSender: !!messaging.sender,
            correlationId
        });

        return null;
    } catch (error) {
        logger.error('Error parsing Instagram messaging event', {
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId
        });
        return null;
    }
}

/**
 * Parse Instagram change event (newer format)
 */
function parseInstagramChangeEvent(
    value: any,
    businessAccountId: string,
    correlationId: string
): ProcessedMessage | null {
    try {
        let messageText = '';
        let messageId = '';

        if (value.message) {
            messageId = value.message.mid;
            
            if (value.message.text) {
                messageText = value.message.text;
            } else if (value.message.attachments && value.message.attachments.length > 0) {
                const attachment = value.message.attachments[0];
                if (attachment) {
                    messageText = `[${attachment.type.charAt(0).toUpperCase() + attachment.type.slice(1)} received]`;
                }
            }
        } else if (value.postback) {
            messageId = uuidv4();
            messageText = value.postback.title || value.postback.payload;
        }

        if (messageText && messageId && value.sender) {
            logger.info('✅ Instagram message parsed (changes format)', {
                messageId,
                phoneNumberId: businessAccountId,
                customerPhone: value.sender.id,
                messageText: messageText.substring(0, 50),
                correlationId
            });

            return {
                message_id: messageId,
                phone_number_id: businessAccountId,
                customer_phone: value.sender.id,
                message_text: messageText,
                timestamp: value.timestamp?.toString() || Date.now().toString(),
                platform_type: 'instagram'
            };
        }

        return null;
    } catch (error) {
        logger.error('Error parsing Instagram change event', {
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId
        });
        return null;
    }
}

/**
 * Handle webhook verification for Meta platforms
 */
export function handleWebhookVerification(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const correlationId = req.get('x-correlation-id') || 'unknown';

    logger.info('Webhook verification request received', {
        mode,
        token: token ? 'provided' : 'missing',
        challenge: challenge ? 'provided' : 'missing',
        correlationId
    });

    // Use WEBHOOK_VERIFY_TOKEN for verification (or fall back to WEBHOOK_SECRET for backward compatibility)
    const verifyToken = process.env['WEBHOOK_VERIFY_TOKEN'] || process.env['WEBHOOK_SECRET'];
    
    if (mode === 'subscribe' && token === verifyToken) {
        logger.info('Webhook verification successful', { correlationId });
        res.status(200).send(challenge);
    } else {
        logger.warn('Webhook verification failed', {
            mode,
            tokenMatch: token === verifyToken,
            correlationId
        });
        res.status(403).json({
            error: 'Forbidden',
            correlationId,
            timestamp: new Date().toISOString()
        });
    }
}