import { MessageQueue, QueueConfig, defaultQueueConfig, ProcessingLease } from '../../../src/utils/queue';
import { QueuedMessage } from '../../../src/models/types';
import { redis } from '../../../src/utils/redis';

// Mock Redis
jest.mock('../../../src/utils/redis', () => ({
    redis: {
        getClient: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
    }
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('MessageQueue', () => {
    let messageQueue: MessageQueue;
    let mockRedisClient: any;
    let testConfig: QueueConfig;

    const mockMessage: QueuedMessage = {
        message_id: 'msg-123',
        phone_number_id: 'phone-456',
        customer_phone: '+1234567890',
        message_text: 'Hello, world!',
        timestamp: '2023-01-01T00:00:00Z',
        platform_type: 'whatsapp'
    };

    beforeEach(() => {
        // Reset MessageQueue singleton
        (MessageQueue as any).instance = undefined;

        testConfig = {
            maxQueueSize: 1000,
            leaseTimeoutMs: 60000, // 1 minute
            pollIntervalMs: 1000,
            maxRetries: 3
        };

        // Setup Redis client mock
        mockRedisClient = {
            xAdd: jest.fn(),
            xRead: jest.fn(),
            xDel: jest.fn(),
            xLen: jest.fn(),
            keys: jest.fn(),
        };

        (redis.getClient as jest.Mock).mockReturnValue(mockRedisClient);
        (redis.set as jest.Mock).mockResolvedValue(undefined);
        (redis.get as jest.Mock).mockResolvedValue(null);
        (redis.del as jest.Mock).mockResolvedValue(1);

        messageQueue = MessageQueue.getInstance(testConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should create singleton instance with config', () => {
            const instance1 = MessageQueue.getInstance(testConfig);
            const instance2 = MessageQueue.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should throw error if no config provided for first initialization', () => {
            (MessageQueue as any).instance = undefined;

            expect(() => MessageQueue.getInstance()).toThrow('MessageQueue config required for first initialization');
        });
    });

    describe('enqueue', () => {
        beforeEach(() => {
            mockRedisClient.keys.mockResolvedValue([]); // Empty queue keys
            mockRedisClient.xLen.mockResolvedValue(0); // Empty queue
            mockRedisClient.xAdd.mockResolvedValue('1234567890-0');
        });

        it('should enqueue message successfully', async () => {
            await messageQueue.enqueue(mockMessage);

            expect(mockRedisClient.xAdd).toHaveBeenCalledWith(
                'queue:messages:phone-456',
                '*',
                expect.objectContaining({
                    messageId: 'msg-123',
                    phoneNumberId: 'phone-456',
                    enqueuedAt: expect.any(String)
                })
            );
        });

        it('should reject message when queue is at capacity', async () => {
            mockRedisClient.keys.mockResolvedValue(['queue:messages:phone-456']);
            mockRedisClient.xLen.mockResolvedValue(testConfig.maxQueueSize);

            await expect(messageQueue.enqueue(mockMessage)).rejects.toThrow('Queue capacity exceeded');
        });

        it('should serialize message with metadata', async () => {
            await messageQueue.enqueue(mockMessage);

            const call = mockRedisClient.xAdd.mock.calls[0];
            const messageData = JSON.parse(call[2].message);

            expect(messageData).toMatchObject({
                ...mockMessage,
                enqueuedAt: expect.any(String),
                retryCount: 0
            });
        });

        it('should handle Redis errors during enqueue', async () => {
            const error = new Error('Redis connection failed');
            mockRedisClient.xAdd.mockRejectedValue(error);

            await expect(messageQueue.enqueue(mockMessage)).rejects.toThrow('Redis connection failed');
        });
    });

    describe('dequeue', () => {
        const mockStreamMessage = {
            id: '1234567890-0',
            message: {
                message: JSON.stringify({
                    ...mockMessage,
                    enqueuedAt: '2023-01-01T00:00:00Z',
                    retryCount: 0
                }),
                messageId: 'msg-123',
                phoneNumberId: 'phone-456',
                enqueuedAt: '2023-01-01T00:00:00Z'
            }
        };

        beforeEach(() => {
            mockRedisClient.xRead.mockResolvedValue([{
                name: 'queue:messages:phone-456',
                messages: [mockStreamMessage]
            }]);
            mockRedisClient.xDel.mockResolvedValue(1);
            (redis.set as jest.Mock).mockResolvedValue(undefined);
        });

        it('should dequeue message with lease', async () => {
            const result = await messageQueue.dequeue('phone-456');

            expect(result).not.toBeNull();
            expect(result!.message).toMatchObject(mockMessage);
            expect(result!.lease).toMatchObject({
                messageId: 'msg-123',
                phoneNumberId: 'phone-456',
                leaseId: expect.any(String),
                expiresAt: expect.any(Date)
            });
        });

        it('should return null when no messages available', async () => {
            mockRedisClient.xRead.mockResolvedValue([]);
            mockRedisClient.keys.mockResolvedValue([]); // No queue keys

            const result = await messageQueue.dequeue('phone-456');

            expect(result).toBeNull();
        });

        it('should remove message from queue after dequeue', async () => {
            await messageQueue.dequeue('phone-456');

            expect(mockRedisClient.xDel).toHaveBeenCalledWith(
                'queue:messages:phone-456',
                '1234567890-0'
            );
        });

        it('should create processing entry with TTL', async () => {
            await messageQueue.dequeue('phone-456');

            expect(redis.set).toHaveBeenCalledWith(
                expect.stringMatching(/^processing:messages:phone-456:msg-123$/),
                expect.any(String),
                60 // TTL in seconds
            );
        });

        it('should handle dequeue from any phone number when none specified', async () => {
            mockRedisClient.keys.mockResolvedValue(['queue:messages:phone-456']);

            const result = await messageQueue.dequeue();

            expect(result).not.toBeNull();
            expect(mockRedisClient.keys).toHaveBeenCalledWith('queue:messages:*');
        });
    });

    describe('complete', () => {
        const mockLease: ProcessingLease = {
            messageId: 'msg-123',
            phoneNumberId: 'phone-456',
            leaseId: 'phone-456-msg-123-1234567890',
            expiresAt: new Date(Date.now() + 60000)
        };

        it('should remove message from processing queue and lease', async () => {
            await messageQueue.complete(mockLease);

            expect(redis.del).toHaveBeenCalledWith('processing:messages:phone-456:msg-123');
            expect(redis.del).toHaveBeenCalledWith('lease:message:phone-456-msg-123-1234567890');
        });

        it('should handle Redis errors during completion', async () => {
            const error = new Error('Redis error');
            (redis.del as jest.Mock).mockRejectedValue(error);

            await expect(messageQueue.complete(mockLease)).rejects.toThrow('Redis error');
        });
    });

    describe('fail', () => {
        const mockLease: ProcessingLease = {
            messageId: 'msg-123',
            phoneNumberId: 'phone-456',
            leaseId: 'phone-456-msg-123-1234567890',
            expiresAt: new Date(Date.now() + 60000)
        };

        const mockProcessingMessage = {
            ...mockMessage,
            retryCount: 1,
            enqueuedAt: '2023-01-01T00:00:00Z'
        };

        beforeEach(() => {
            (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockProcessingMessage));
            mockRedisClient.xAdd.mockResolvedValue('1234567890-1');
        });

        it('should re-enqueue message for retry when under max retries', async () => {
            // Mock empty queue for re-enqueue
            mockRedisClient.keys.mockResolvedValue([]);

            await messageQueue.fail(mockLease, 'Processing failed', true);

            expect(mockRedisClient.xAdd).toHaveBeenCalled();
            expect(redis.del).toHaveBeenCalledWith('processing:messages:phone-456:msg-123');
            expect(redis.del).toHaveBeenCalledWith('lease:message:phone-456-msg-123-1234567890');
        });

        it('should move to failed queue when max retries exceeded', async () => {
            const maxRetriesMessage = { ...mockProcessingMessage, retryCount: testConfig.maxRetries };
            (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(maxRetriesMessage));

            await messageQueue.fail(mockLease, 'Processing failed', true);

            expect(redis.set).toHaveBeenCalledWith(
                'failed:messages:phone-456:msg-123',
                expect.any(String),
                86400 // 24 hours TTL
            );
            expect(mockRedisClient.xAdd).not.toHaveBeenCalled();
        });

        it('should move to failed queue when retry is false', async () => {
            await messageQueue.fail(mockLease, 'Processing failed', false);

            expect(redis.set).toHaveBeenCalledWith(
                'failed:messages:phone-456:msg-123',
                expect.any(String),
                86400
            );
            expect(mockRedisClient.xAdd).not.toHaveBeenCalled();
        });

        it('should handle missing message in processing queue', async () => {
            (redis.get as jest.Mock).mockResolvedValue(null);

            await messageQueue.fail(mockLease, 'Processing failed');

            // Should not throw error, just log warning and clean up lease
            expect(redis.del).toHaveBeenCalledWith('lease:message:phone-456-msg-123-1234567890');
            expect(redis.del).toHaveBeenCalledTimes(1); // Only lease cleanup
        });
    });

    describe('extendLease', () => {
        const mockLease: ProcessingLease = {
            messageId: 'msg-123',
            phoneNumberId: 'phone-456',
            leaseId: 'phone-456-msg-123-1234567890',
            expiresAt: new Date(Date.now() + 60000)
        };

        const mockProcessingMessage = {
            ...mockMessage,
            lease: mockLease
        };

        beforeEach(() => {
            (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockProcessingMessage));
        });

        it('should extend lease expiration time', async () => {
            const extensionMs = 30000; // 30 seconds

            // Mock Date.now to ensure consistent timing
            const mockNow = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(mockNow);

            const extendedLease = await messageQueue.extendLease(mockLease, extensionMs);

            expect(extendedLease.expiresAt.getTime()).toBe(mockNow + extensionMs);
            expect(redis.set).toHaveBeenCalledWith(
                'lease:message:phone-456-msg-123-1234567890',
                expect.any(String),
                30 // TTL in seconds
            );

            jest.restoreAllMocks();
        });

        it('should update processing queue entry with new lease', async () => {
            const extensionMs = 30000;
            await messageQueue.extendLease(mockLease, extensionMs);

            expect(redis.set).toHaveBeenCalledWith(
                'processing:messages:phone-456:msg-123',
                expect.stringContaining('"expiresAt"'),
                30
            );
        });

        it('should handle missing processing message during extension', async () => {
            (redis.get as jest.Mock).mockResolvedValue(null);

            // Mock Date.now to ensure consistent timing
            const mockNow = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(mockNow);

            const extendedLease = await messageQueue.extendLease(mockLease, 30000);

            expect(extendedLease.expiresAt.getTime()).toBe(mockNow + 30000);
            // Should still update lease even if processing message is missing
            expect(redis.set).toHaveBeenCalledWith(
                'lease:message:phone-456-msg-123-1234567890',
                expect.any(String),
                30
            );

            jest.restoreAllMocks();
        });
    });

    describe('recoverExpiredLeases', () => {
        const expiredLease: ProcessingLease = {
            messageId: 'msg-123',
            phoneNumberId: 'phone-456',
            leaseId: 'phone-456-msg-123-1234567890',
            expiresAt: new Date(Date.now() - 60000) // Expired 1 minute ago
        };

        const validLease: ProcessingLease = {
            messageId: 'msg-124',
            phoneNumberId: 'phone-456',
            leaseId: 'phone-456-msg-124-1234567891',
            expiresAt: new Date(Date.now() + 60000) // Expires in 1 minute
        };

        beforeEach(() => {
            jest.clearAllMocks();
            mockRedisClient.xAdd.mockResolvedValue('1234567890-2');
        });

        it('should recover expired leases and re-enqueue messages', async () => {
            mockRedisClient.keys
                .mockResolvedValueOnce(['queue:messages:phone-456']) // getAllPhoneNumbers
                .mockResolvedValueOnce(['processing:messages:phone-456:msg-123', 'processing:messages:phone-456:msg-124']) // processing keys
                .mockResolvedValueOnce([]); // Empty queue for re-enqueue

            (redis.get as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify({ ...mockMessage, lease: expiredLease }))
                .mockResolvedValueOnce(JSON.stringify({ ...mockMessage, lease: validLease }));

            const recoveredCount = await messageQueue.recoverExpiredLeases();

            expect(recoveredCount).toBe(1);
            expect(redis.del).toHaveBeenCalledWith('processing:messages:phone-456:msg-123');
            expect(redis.del).toHaveBeenCalledWith('lease:message:phone-456-msg-123-1234567890');
            expect(mockRedisClient.xAdd).toHaveBeenCalledTimes(1);
        });

        it('should not recover valid leases', async () => {
            mockRedisClient.keys
                .mockResolvedValueOnce(['queue:messages:phone-456']) // getAllPhoneNumbers
                .mockResolvedValueOnce(['processing:messages:phone-456:msg-123', 'processing:messages:phone-456:msg-124']) // processing keys
                .mockResolvedValueOnce([]); // Empty queue for re-enqueue

            (redis.get as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify({ ...mockMessage, lease: expiredLease }))
                .mockResolvedValueOnce(JSON.stringify({ ...mockMessage, lease: validLease }));

            const recoveredCount = await messageQueue.recoverExpiredLeases();

            expect(recoveredCount).toBe(1);
            // Should not delete valid lease
            expect(redis.del).not.toHaveBeenCalledWith('processing:messages:phone-456:msg-124');
            expect(redis.del).not.toHaveBeenCalledWith('lease:message:phone-456-msg-124-1234567891');
        });

        it('should return 0 when no expired leases found', async () => {
            mockRedisClient.keys
                .mockResolvedValueOnce(['queue:messages:phone-456'])
                .mockResolvedValueOnce([]);

            const recoveredCount = await messageQueue.recoverExpiredLeases();

            expect(recoveredCount).toBe(0);
        });
    });

    describe('getStats', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return comprehensive queue statistics', async () => {
            mockRedisClient.keys
                .mockResolvedValueOnce(['queue:messages:phone-456', 'queue:messages:phone-789']) // getAllPhoneNumbers
                .mockResolvedValueOnce(['processing:messages:phone-456:msg-1']) // processing keys for phone-456
                .mockResolvedValueOnce(['failed:messages:phone-456:msg-2']) // failed keys for phone-456
                .mockResolvedValueOnce(['processing:messages:phone-789:msg-3', 'processing:messages:phone-789:msg-4']) // processing keys for phone-789
                .mockResolvedValueOnce([]); // failed keys for phone-789

            mockRedisClient.xLen
                .mockResolvedValueOnce(5) // queue length for phone-456
                .mockResolvedValueOnce(3); // queue length for phone-789

            const stats = await messageQueue.getStats();

            expect(stats).toEqual({
                totalMessages: 8, // 5 + 3
                processingMessages: 3, // 1 + 2
                failedMessages: 1, // 1 + 0
                queuesByPhoneNumber: {
                    'phone-456': 5,
                    'phone-789': 3
                }
            });
        });

        it('should handle empty queues', async () => {
            mockRedisClient.keys.mockResolvedValue([]);

            const stats = await messageQueue.getStats();

            expect(stats).toEqual({
                totalMessages: 0,
                processingMessages: 0,
                failedMessages: 0,
                queuesByPhoneNumber: {}
            });
        });
    });

    describe('defaultQueueConfig', () => {
        it('should provide sensible default configuration', () => {
            expect(defaultQueueConfig).toEqual({
                maxQueueSize: 100000,
                leaseTimeoutMs: 300000, // 5 minutes
                pollIntervalMs: 1000,   // 1 second
                maxRetries: 3
            });
        });
    });

    describe('error handling', () => {
        it('should handle Redis connection errors gracefully', async () => {
            const error = new Error('Redis connection lost');
            // Mock keys to return empty array first, then let xAdd fail
            mockRedisClient.keys.mockResolvedValue([]);
            mockRedisClient.xAdd.mockRejectedValue(error);

            await expect(messageQueue.enqueue(mockMessage)).rejects.toThrow('Redis connection lost');
        });

        it('should handle malformed message data', async () => {
            (redis.get as jest.Mock).mockResolvedValue('invalid json');

            const mockLease: ProcessingLease = {
                messageId: 'msg-123',
                phoneNumberId: 'phone-456',
                leaseId: 'test-lease',
                expiresAt: new Date()
            };

            await expect(messageQueue.fail(mockLease, 'test error')).rejects.toThrow();
        });
    });
});