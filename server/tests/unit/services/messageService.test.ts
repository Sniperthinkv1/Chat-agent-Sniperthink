import {
    sendMessage,
    trackMessageDelivery,
    getMessageDeliveryStatus,
    retryFailedMessage,
    getFailedMessages,
    getDeliveryStatistics,
    MessageServiceError
} from '../../../src/services/messageService';
import { db } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';
import { platformsConfig } from '../../../src/config';

// Mock dependencies
jest.mock('../../../src/utils/database', () => ({
    db: {
        query: jest.fn()
    }
}));
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config');

// Mock fetch globally
global.fetch = jest.fn();

const mockDb = db as jest.Mocked<typeof db>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock config
const mockPlatformsConfig = {
    whatsappBaseUrl: 'https://graph.facebook.com/v24.0',
    instagramBaseUrl: 'https://graph.facebook.com/v24.0',
    webchatWidgetUrl: 'https://example.com/webchat'
};

(platformsConfig as any) = mockPlatformsConfig;

// Helper function to create mock query result
const createMockQueryResult = (rows: any[]) => ({
    rows,
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: []
});

describe('Message Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger.info = jest.fn();
        mockLogger.debug = jest.fn();
        mockLogger.warn = jest.fn();
        mockLogger.error = jest.fn();
    });

    describe('sendMessage', () => {
        const mockAccessTokenResult = {
            rows: [{
                access_token: 'test-access-token',
                meta_phone_number_id: 'phone123',
                platform: 'whatsapp',
                display_name: '+1234567890'
            }]
        };

        beforeEach(() => {
            mockDb.query.mockResolvedValue(createMockQueryResult(mockAccessTokenResult.rows));
        });

        it('should successfully send WhatsApp message', async () => {
            // Arrange
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    messages: [{ id: 'msg123' }]
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            const result = await sendMessage('phone123', 'customer123', 'Hello', 'whatsapp');

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('msg123');
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['phone123']
            );
            expect(mockFetch).toHaveBeenCalledWith(
                'https://graph.facebook.com/v24.0/phone123/messages',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-access-token'
                    })
                })
            );
        });

        it('should successfully send Instagram message', async () => {
            // Arrange
            const instagramTokenResult = {
                rows: [{
                    access_token: 'instagram-token',
                    meta_phone_number_id: 'business123',
                    platform: 'instagram'
                }]
            };
            mockDb.query.mockResolvedValue(createMockQueryResult(instagramTokenResult.rows));

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message_id: 'msg456'
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            const result = await sendMessage('business123', 'user123', 'Hello', 'instagram');

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('msg456');
            expect(mockFetch).toHaveBeenCalledWith(
                'https://graph.facebook.com/v24.0/business123/messages',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        messaging_type: 'RESPONSE',
                        recipient: { id: 'user123' },
                        message: { text: 'Hello' }
                    })
                })
            );
        });

        it('should validate required inputs', async () => {
            // Test empty phone number ID
            let result = await sendMessage('', 'customer123', 'Hello', 'whatsapp');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_INPUT');

            // Test empty customer phone
            result = await sendMessage('phone123', '', 'Hello', 'whatsapp');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_INPUT');

            // Test empty message text
            result = await sendMessage('phone123', 'customer123', '', 'whatsapp');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_INPUT');
        });

        it('should handle missing access token', async () => {
            // Arrange
            mockDb.query.mockResolvedValue(createMockQueryResult([]));

            // Act
            const result = await sendMessage('phone123', 'customer123', 'Hello', 'whatsapp');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('TOKEN_NOT_FOUND');
        });

        it('should handle platform mismatch', async () => {
            // Arrange
            const mismatchResult = {
                rows: [{
                    access_token: 'test-token',
                    meta_phone_number_id: 'phone123',
                    platform: 'instagram'
                }]
            };
            mockDb.query.mockResolvedValue(createMockQueryResult(mismatchResult.rows));

            // Act
            const result = await sendMessage('phone123', 'customer123', 'Hello', 'whatsapp');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('PLATFORM_MISMATCH');
        });

        it('should handle WhatsApp API errors with specific error codes', async () => {
            // Arrange
            const mockResponse = {
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValue({
                    error: {
                        code: 131047,
                        message: 'Re-engagement window expired'
                    }
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            const result = await sendMessage('phone123', 'customer123', 'Hello', 'whatsapp');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('WHATSAPP_WINDOW_EXPIRED');
            expect(result.retryable).toBe(false);
        });

        it('should handle Instagram API errors with specific error codes', async () => {
            // Arrange
            const instagramTokenResult = {
                rows: [{
                    access_token: 'instagram-token',
                    meta_phone_number_id: 'business123',
                    platform: 'instagram'
                }]
            };
            mockDb.query.mockResolvedValue(createMockQueryResult(instagramTokenResult.rows));

            const mockResponse = {
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValue({
                    error: {
                        code: 551,
                        message: 'User not available'
                    }
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            const result = await sendMessage('business123', 'user123', 'Hello', 'instagram');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INSTAGRAM_USER_UNAVAILABLE');
            expect(result.retryable).toBe(true);
        });

        it('should handle rate limit errors as retryable', async () => {
            // Arrange
            const mockResponse = {
                ok: false,
                status: 429,
                json: jest.fn().mockResolvedValue({
                    error: { message: 'Rate limit exceeded' }
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            const result = await sendMessage('phone123', 'customer123', 'Hello', 'whatsapp');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('WHATSAPP_RATE_LIMIT');
            expect(result.retryable).toBe(true);
        });

        it('should handle network errors', async () => {
            // Arrange
            mockFetch.mockRejectedValue(new Error('Network error'));

            // Act
            const result = await sendMessage('phone123', 'customer123', 'Hello', 'whatsapp');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('WHATSAPP_NETWORK_ERROR');
            expect(result.retryable).toBe(true);
        });

        it('should truncate long messages to platform limits', async () => {
            // Arrange
            const longMessage = 'a'.repeat(5000); // Longer than WhatsApp limit
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    messages: [{ id: 'msg123' }]
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            await sendMessage('phone123', 'customer123', longMessage, 'whatsapp');

            // Assert
            const fetchCall = mockFetch.mock.calls[0];
            if (fetchCall && fetchCall[1] && typeof fetchCall[1] === 'object' && 'body' in fetchCall[1]) {
                const requestBody = JSON.parse(fetchCall[1].body as string);
                expect(requestBody.text.body.length).toBe(4096); // WhatsApp limit
            }
        });
    });

    describe('trackMessageDelivery', () => {
        it('should successfully track message delivery', async () => {
            // Arrange
            mockDb.query.mockResolvedValue(createMockQueryResult([]));

            // Act
            await trackMessageDelivery('msg123', 'sent', 'platform-msg-123');

            // Assert
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO message_delivery_status'),
                ['msg123', 'platform-msg-123', 'sent', undefined]
            );
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            mockDb.query.mockRejectedValue(new Error('Database error'));

            // Act & Assert - Should not throw
            await expect(trackMessageDelivery('msg123', 'sent')).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getMessageDeliveryStatus', () => {
        it('should successfully retrieve delivery status', async () => {
            // Arrange
            const mockResult = {
                rows: [{
                    status: 'sent',
                    platform_message_id: 'platform-msg-123',
                    error_message: null,
                    updated_at: new Date()
                }]
            };
            mockDb.query.mockResolvedValue(createMockQueryResult(mockResult.rows));

            // Act
            const result = await getMessageDeliveryStatus('msg123');

            // Assert
            expect(result).not.toBeNull();
            expect(result!.status).toBe('sent');
            expect(result!.platformMessageId).toBe('platform-msg-123');
        });

        it('should return null when status not found', async () => {
            // Arrange
            mockDb.query.mockResolvedValue(createMockQueryResult([]));

            // Act
            const result = await getMessageDeliveryStatus('msg123');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('retryFailedMessage', () => {
        it('should successfully retry failed message', async () => {
            // Arrange
            const messageResult = {
                rows: [{
                    id: 'msg123',
                    conversation_id: 'conv123',
                    content: 'Hello',
                    sender_type: 'agent',
                    phone_number_id: 'phone123',
                    contact_phone: 'customer123',
                    platform: 'whatsapp',
                    user_id: 'user123'
                }]
            };
            
            const tokenResult = {
                rows: [{
                    access_token: 'test-token',
                    meta_phone_number_id: 'phone123',
                    platform: 'whatsapp'
                }]
            };

            mockDb.query
                .mockResolvedValueOnce(createMockQueryResult(messageResult.rows))
                .mockResolvedValueOnce(createMockQueryResult(tokenResult.rows))
                .mockResolvedValueOnce(createMockQueryResult([])); // updateMessageStatus

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    messages: [{ id: 'new-msg-123' }]
                })
            } as any;
            mockFetch.mockResolvedValue(mockResponse);

            // Act
            const result = await retryFailedMessage('msg123', 'user123');

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('new-msg-123');
        });

        it('should handle message not found', async () => {
            // Arrange
            mockDb.query.mockResolvedValue(createMockQueryResult([]));

            // Act
            const result = await retryFailedMessage('msg123', 'user123');

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('MESSAGE_NOT_FOUND');
        });
    });

    describe('getFailedMessages', () => {
        it('should successfully retrieve failed messages', async () => {
            // Arrange
            const mockResult = {
                rows: [{
                    message_id: 'msg123',
                    conversation_id: 'conv123',
                    content: 'Hello',
                    created_at: new Date(),
                    phone_number_id: 'phone123',
                    contact_phone: 'customer123',
                    platform: 'whatsapp'
                }]
            };
            mockDb.query.mockResolvedValue(createMockQueryResult(mockResult.rows));

            // Act
            const result = await getFailedMessages('user123', 50, 0);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]?.messageId).toBe('msg123');
            expect(result[0]?.platform).toBe('whatsapp');
        });

        it('should handle database errors', async () => {
            // Arrange
            mockDb.query.mockRejectedValue(new Error('Database error'));

            // Act
            const result = await getFailedMessages('user123');

            // Assert
            expect(result).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getDeliveryStatistics', () => {
        it('should successfully retrieve delivery statistics', async () => {
            // Arrange
            const mockResult = {
                rows: [
                    { status: 'sent', count: '10' },
                    { status: 'delivered', count: '8' },
                    { status: 'failed', count: '2' }
                ]
            };
            mockDb.query.mockResolvedValue(createMockQueryResult(mockResult.rows));

            // Act
            const result = await getDeliveryStatistics('user123', 'day');

            // Assert
            expect(result.sent).toBe(10);
            expect(result.delivered).toBe(8);
            expect(result.failed).toBe(2);
            expect(result.totalMessages).toBe(20);
        });

        it('should handle database errors', async () => {
            // Arrange
            mockDb.query.mockRejectedValue(new Error('Database error'));

            // Act
            const result = await getDeliveryStatistics('user123');

            // Assert
            expect(result.totalMessages).toBe(0);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('MessageServiceError', () => {
        it('should create error with all properties', () => {
            // Act
            const error = new MessageServiceError('Test error', 'TEST_CODE', 400, true);

            // Assert
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.statusCode).toBe(400);
            expect(error.retryable).toBe(true);
            expect(error.name).toBe('MessageServiceError');
        });

        it('should create error with default retryable false', () => {
            // Act
            const error = new MessageServiceError('Test error', 'TEST_CODE');

            // Assert
            expect(error.retryable).toBe(false);
            expect(error.statusCode).toBeUndefined();
        });
    });
});