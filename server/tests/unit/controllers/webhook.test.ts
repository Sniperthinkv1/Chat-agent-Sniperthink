import { Request, Response } from 'express';
import { logger } from '../../../src/utils/logger';

// Mock dependencies before importing the controller
jest.mock('../../../src/utils/queue', () => ({
    enqueueMessage: jest.fn()
}));
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/redis');

// Import after mocking
import { handleMetaWebhook, handleWebhookVerification } from '../../../src/controllers/webhook';
import { enqueueMessage } from '../../../src/utils/queue';

const mockEnqueueMessage = enqueueMessage as jest.MockedFunction<typeof enqueueMessage>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Webhook Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockSend: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn().mockReturnThis();
        mockStatus = jest.fn().mockReturnThis();
        mockSend = jest.fn().mockReturnThis();

        mockResponse = {
            json: mockJson,
            status: mockStatus,
            send: mockSend
        };

        mockRequest = {
            get: jest.fn(),
            body: {},
            query: {}
        };

        // Reset mocks
        jest.clearAllMocks();
        mockEnqueueMessage.mockResolvedValue();
    });

    describe('handleMetaWebhook', () => {
        beforeEach(() => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                return undefined;
            });
        });

        describe('WhatsApp webhook processing', () => {
            it('should process WhatsApp text message successfully', async () => {
                const whatsappPayload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'business-account-id',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '+1234567890',
                                    phone_number_id: 'phone-123'
                                },
                                messages: [{
                                    from: 'customer-123',
                                    id: 'msg-123',
                                    timestamp: '1234567890',
                                    type: 'text',
                                    text: { body: 'Hello world' }
                                }]
                            },
                            field: 'messages'
                        }]
                    }]
                };

                mockRequest.body = whatsappPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockEnqueueMessage).toHaveBeenCalledWith({
                    message_id: 'msg-123',
                    phone_number_id: 'phone-123',
                    customer_phone: 'customer-123',
                    message_text: 'Hello world',
                    timestamp: '1234567890',
                    platform_type: 'whatsapp'
                });

                expect(mockStatus).toHaveBeenCalledWith(200);
                expect(mockJson).toHaveBeenCalledWith({
                    status: 'received',
                    messagesProcessed: 1,
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });
            });

            it('should handle WhatsApp media messages', async () => {
                const whatsappPayload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'business-account-id',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '+1234567890',
                                    phone_number_id: 'phone-123'
                                },
                                messages: [
                                    {
                                        from: 'customer-123',
                                        id: 'msg-image',
                                        timestamp: '1234567890',
                                        type: 'image',
                                        image: { mime_type: 'image/jpeg', sha256: 'hash', id: 'img-123' }
                                    },
                                    {
                                        from: 'customer-123',
                                        id: 'msg-audio',
                                        timestamp: '1234567891',
                                        type: 'audio',
                                        audio: { mime_type: 'audio/ogg', sha256: 'hash', id: 'audio-123', voice: true }
                                    }
                                ]
                            },
                            field: 'messages'
                        }]
                    }]
                };

                mockRequest.body = whatsappPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockEnqueueMessage).toHaveBeenCalledTimes(2);
                expect(mockEnqueueMessage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message_id: 'msg-image',
                        message_text: '[Image received]',
                        platform_type: 'whatsapp'
                    })
                );
                expect(mockEnqueueMessage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message_id: 'msg-audio',
                        message_text: '[Voice message]',
                        platform_type: 'whatsapp'
                    })
                );
            });

            it('should handle WhatsApp status updates without processing', async () => {
                const whatsappPayload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'business-account-id',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '+1234567890',
                                    phone_number_id: 'phone-123'
                                },
                                statuses: [{
                                    id: 'msg-123',
                                    status: 'delivered',
                                    timestamp: '1234567890',
                                    recipient_id: 'customer-123'
                                }]
                            },
                            field: 'messages'
                        }]
                    }]
                };

                mockRequest.body = whatsappPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockEnqueueMessage).not.toHaveBeenCalled();
                expect(mockStatus).toHaveBeenCalledWith(200);
                expect(mockJson).toHaveBeenCalledWith({
                    status: 'received',
                    messagesProcessed: 0,
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });
            });
        });

        describe('Instagram webhook processing', () => {
            it('should process Instagram text message successfully', async () => {
                const instagramPayload = {
                    object: 'instagram',
                    entry: [{
                        id: 'instagram-business-123',
                        time: 1234567890,
                        messaging: [{
                            sender: { id: 'user-123' },
                            recipient: { id: 'instagram-business-123' },
                            timestamp: 1234567890,
                            message: {
                                mid: 'msg-123',
                                text: 'Hello from Instagram'
                            }
                        }]
                    }]
                };

                mockRequest.body = instagramPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockEnqueueMessage).toHaveBeenCalledWith({
                    message_id: 'msg-123',
                    phone_number_id: 'instagram-business-123',
                    customer_phone: 'user-123',
                    message_text: 'Hello from Instagram',
                    timestamp: '1234567890',
                    platform_type: 'instagram'
                });

                expect(mockStatus).toHaveBeenCalledWith(200);
                expect(mockJson).toHaveBeenCalledWith({
                    status: 'received',
                    messagesProcessed: 1,
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });
            });

            it('should handle Instagram media attachments', async () => {
                const instagramPayload = {
                    object: 'instagram',
                    entry: [{
                        id: 'instagram-business-123',
                        time: 1234567890,
                        messaging: [{
                            sender: { id: 'user-123' },
                            recipient: { id: 'instagram-business-123' },
                            timestamp: 1234567890,
                            message: {
                                mid: 'msg-123',
                                attachments: [{
                                    type: 'image',
                                    payload: { url: 'https://example.com/image.jpg' }
                                }]
                            }
                        }]
                    }]
                };

                mockRequest.body = instagramPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockEnqueueMessage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message_text: '[Image received]',
                        platform_type: 'instagram'
                    })
                );
            });

            it('should handle Instagram postback messages', async () => {
                const instagramPayload = {
                    object: 'instagram',
                    entry: [{
                        id: 'instagram-business-123',
                        time: 1234567890,
                        messaging: [{
                            sender: { id: 'user-123' },
                            recipient: { id: 'instagram-business-123' },
                            timestamp: 1234567890,
                            postback: {
                                payload: 'GET_STARTED',
                                title: 'Get Started'
                            }
                        }]
                    }]
                };

                mockRequest.body = instagramPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockEnqueueMessage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message_text: 'Get Started',
                        platform_type: 'instagram'
                    })
                );
            });
        });

        describe('Error handling', () => {
            it('should handle invalid payload structure', async () => {
                mockRequest.body = { invalid: 'payload' };

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockStatus).toHaveBeenCalledWith(400);
                expect(mockJson).toHaveBeenCalledWith({
                    error: 'Invalid payload structure',
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });
            });

            it('should handle unsupported webhook object type', async () => {
                mockRequest.body = { object: 'unsupported_platform' };

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockStatus).toHaveBeenCalledWith(400);
                expect(mockJson).toHaveBeenCalledWith({
                    error: 'Unsupported webhook object type',
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });
            });

            it('should handle queue failures gracefully', async () => {
                mockEnqueueMessage.mockRejectedValue(new Error('Queue error'));

                const whatsappPayload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'business-account-id',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '+1234567890',
                                    phone_number_id: 'phone-123'
                                },
                                messages: [{
                                    from: 'customer-123',
                                    id: 'msg-123',
                                    timestamp: '1234567890',
                                    type: 'text',
                                    text: { body: 'Hello world' }
                                }]
                            },
                            field: 'messages'
                        }]
                    }]
                };

                mockRequest.body = whatsappPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockLogger.error).toHaveBeenCalledWith(
                    'Failed to enqueue message',
                    expect.objectContaining({
                        message_id: 'msg-123',
                        error: 'Queue error'
                    })
                );

                expect(mockStatus).toHaveBeenCalledWith(200);
                expect(mockJson).toHaveBeenCalledWith({
                    status: 'received',
                    messagesProcessed: 1,
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });
            });

            it('should handle processing errors and still return 200', async () => {
                // Mock enqueueMessage to throw an error that propagates up
                mockEnqueueMessage.mockRejectedValue(new Error('Critical queue error'));
                
                // Mock Promise.allSettled to throw an error
                const originalAllSettled = Promise.allSettled;
                Promise.allSettled = jest.fn().mockRejectedValue(new Error('Promise.allSettled error'));

                const whatsappPayload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'business-account-id',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '+1234567890',
                                    phone_number_id: 'phone-123'
                                },
                                messages: [{
                                    from: 'customer-123',
                                    id: 'msg-123',
                                    timestamp: '1234567890',
                                    type: 'text',
                                    text: { body: 'Hello world' }
                                }]
                            },
                            field: 'messages'
                        }]
                    }]
                };

                mockRequest.body = whatsappPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockStatus).toHaveBeenCalledWith(200);
                expect(mockJson).toHaveBeenCalledWith({
                    status: 'error',
                    error: 'Internal processing error',
                    correlationId: 'test-correlation-id',
                    timestamp: expect.any(String)
                });

                // Restore original function
                Promise.allSettled = originalAllSettled;
            });
        });

        describe('Missing correlation ID handling', () => {
            it('should handle missing correlation ID', async () => {
                (mockRequest.get as jest.Mock).mockReturnValue(undefined);

                const whatsappPayload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'business-account-id',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '+1234567890',
                                    phone_number_id: 'phone-123'
                                },
                                messages: [{
                                    from: 'customer-123',
                                    id: 'msg-123',
                                    timestamp: '1234567890',
                                    type: 'text',
                                    text: { body: 'Hello world' }
                                }]
                            },
                            field: 'messages'
                        }]
                    }]
                };

                mockRequest.body = whatsappPayload;

                await handleMetaWebhook(mockRequest as Request, mockResponse as Response);

                expect(mockStatus).toHaveBeenCalledWith(200);
                expect(mockJson).toHaveBeenCalledWith({
                    status: 'received',
                    messagesProcessed: 1,
                    correlationId: 'unknown',
                    timestamp: expect.any(String)
                });
            });
        });
    });

    describe('handleWebhookVerification', () => {
        beforeEach(() => {
            process.env['WEBHOOK_SECRET'] = 'test-secret';
            (mockRequest.get as jest.Mock).mockReturnValue('test-correlation-id');
        });

        afterEach(() => {
            delete process.env['WEBHOOK_SECRET'];
        });

        it('should verify webhook successfully with correct parameters', () => {
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'test-secret',
                'hub.challenge': 'challenge-123'
            };

            handleWebhookVerification(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalledWith('challenge-123');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Webhook verification successful',
                { correlationId: 'test-correlation-id' }
            );
        });

        it('should reject webhook verification with incorrect token', () => {
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'wrong-secret',
                'hub.challenge': 'challenge-123'
            };

            handleWebhookVerification(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Forbidden',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should reject webhook verification with incorrect mode', () => {
            mockRequest.query = {
                'hub.mode': 'unsubscribe',
                'hub.verify_token': 'test-secret',
                'hub.challenge': 'challenge-123'
            };

            handleWebhookVerification(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Forbidden',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should handle missing parameters', () => {
            mockRequest.query = {};

            handleWebhookVerification(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Webhook verification failed',
                expect.objectContaining({
                    mode: undefined,
                    tokenMatch: false
                })
            );
        });
    });
});