import { MessageWorker, processSingleMessage, defaultWorkerConfig, WorkerManager } from '../../../src/workers/messageWorker';
import { QueuedMessage } from '../../../src/models/types';
import { ProcessingLease } from '../../../src/utils/queue';

// Mock all dependencies
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('../../../src/utils/queue', () => ({
    MessageQueue: {
        getInstance: jest.fn().mockReturnValue({
            dequeue: jest.fn(),
            complete: jest.fn(),
            fail: jest.fn(),
            getStats: jest.fn().mockResolvedValue({
                totalMessages: 25,
                processingMessages: 5,
                failedMessages: 2,
                queuesByPhoneNumber: { 'phone-123': 25 }
            })
        })
    },
    defaultQueueConfig: {}
}));

jest.mock('../../../src/utils/locks', () => ({
    createLockManager: jest.fn().mockReturnValue({
        acquireLock: jest.fn(),
        releaseLock: jest.fn()
    }),
    createPhoneNumberLockManager: jest.fn().mockReturnValue({
        acquirePhoneNumberLock: jest.fn(),
        releasePhoneNumberLock: jest.fn(),
        lockManager: {},
        isMessageDuplicate: jest.fn(),
        markMessageProcessed: jest.fn()
    }),
    defaultLockConfig: {},
    defaultDeduplicationConfig: {},
    PhoneNumberLockManager: jest.fn()
}));

jest.mock('../../../src/services/creditService', () => ({
    hasEnoughCredits: jest.fn(),
    deductCredits: jest.fn(),
    InsufficientCreditsError: class InsufficientCreditsError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'InsufficientCreditsError';
        }
    }
}));

jest.mock('../../../src/services/openaiService', () => ({
    callOpenAI: jest.fn()
}));

jest.mock('../../../src/services/messageService', () => ({
    sendMessage: jest.fn(),
    storeMessage: jest.fn()
}));

jest.mock('../../../src/services/conversationService', () => ({
    getOrCreateConversation: jest.fn()
}));

// Import mocked functions
import { hasEnoughCredits, deductCredits } from '../../../src/services/creditService';
import { callOpenAI } from '../../../src/services/openaiService';
import { sendMessage, storeMessage } from '../../../src/services/messageService';
import { getOrCreateConversation } from '../../../src/services/conversationService';
import { createPhoneNumberLockManager } from '../../../src/utils/locks';
import { logger } from '../../../src/utils/logger';

// Get the mocked lock manager
const mockCreatePhoneNumberLockManager = createPhoneNumberLockManager as jest.MockedFunction<typeof createPhoneNumberLockManager>;
let mockLockManager: any;
const mockHasEnoughCredits = hasEnoughCredits as jest.MockedFunction<typeof hasEnoughCredits>;
const mockDeductCredits = deductCredits as jest.MockedFunction<typeof deductCredits>;
const mockCallOpenAI = callOpenAI as jest.MockedFunction<typeof callOpenAI>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;
const mockStoreMessage = storeMessage as jest.MockedFunction<typeof storeMessage>;
const mockGetOrCreateConversation = getOrCreateConversation as jest.MockedFunction<typeof getOrCreateConversation>;

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('MessageWorker', () => {
    let worker: MessageWorker;
    let testMessage: QueuedMessage;
    let testLease: ProcessingLease;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Set up the mock lock manager
        mockLockManager = {
            acquirePhoneNumberLock: jest.fn(),
            releasePhoneNumberLock: jest.fn(),
            lockManager: {},
            isMessageDuplicate: jest.fn(),
            markMessageProcessed: jest.fn()
        };
        
        mockCreatePhoneNumberLockManager.mockReturnValue(mockLockManager);
        
        worker = new MessageWorker(defaultWorkerConfig, 'test-worker');
        
        testMessage = {
            message_id: 'msg-123',
            phone_number_id: 'phone-123',
            customer_phone: 'customer-123',
            message_text: 'Hello world',
            timestamp: '1234567890',
            platform_type: 'whatsapp'
        };

        testLease = {
            messageId: 'msg-123',
            phoneNumberId: 'phone-123',
            leaseId: 'lease-123',
            expiresAt: new Date(Date.now() + 300000)
        };
        
        // Set up default mock responses
        mockLockManager.acquirePhoneNumberLock.mockResolvedValue({
            key: 'lock:phone:phone-123',
            value: 'lock-value-123',
            ttlMs: 300000,
            acquiredAt: new Date(),
            expiresAt: new Date(Date.now() + 300000)
        });
        mockLockManager.releasePhoneNumberLock.mockResolvedValue(true);
        mockHasEnoughCredits.mockResolvedValue(true);
        mockDeductCredits.mockResolvedValue(9);
        mockCallOpenAI.mockResolvedValue({ 
            success: true,
            response: 'AI response', 
            tokensUsed: 50, 
            conversationId: 'conv-123' 
        });
        mockSendMessage.mockResolvedValue({ success: true, messageId: 'sent-123' });
        mockStoreMessage.mockResolvedValue({
            message_id: 'msg-123',
            conversation_id: 'conv-123',
            sender: 'user',
            text: 'Hello world',
            timestamp: new Date(),
            status: 'sent',
            sequence_no: 1
        });
        mockGetOrCreateConversation.mockResolvedValue({
            conversation_id: 'conv-123',
            agent_id: 'agent-123',
            customer_phone: 'customer-123',
            created_at: new Date(),
            last_message_at: new Date(),
            is_active: true,
            agent: {
                agent_id: 'agent-123',
                user_id: 'user-123',
                phone_number_id: 'phone-123',
                prompt_id: 'prompt-123',
                name: 'Test Agent',
                created_at: new Date(),
                updated_at: new Date()
            }
        });
    });

    describe('processMessage', () => {
        it('should process message successfully', async () => {
            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('msg-123');
            expect(result.creditDeducted).toBe(true);

            // Verify all steps were called
            expect(mockLockManager.acquirePhoneNumberLock).toHaveBeenCalledWith('phone-123', defaultWorkerConfig.lockTimeoutMs);
            expect(mockGetOrCreateConversation).toHaveBeenCalledWith('phone-123', 'customer-123');
            expect(mockHasEnoughCredits).toHaveBeenCalledWith('user-123', 1);
            expect(mockStoreMessage).toHaveBeenCalledTimes(2); // Incoming and outgoing messages
            expect(mockCallOpenAI).toHaveBeenCalledWith('Hello world', 'conv-123', 'prompt-123');
            expect(mockSendMessage).toHaveBeenCalledWith('phone-123', 'customer-123', 'AI response', 'whatsapp');
            expect(mockDeductCredits).toHaveBeenCalledWith('user-123', 1);
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should fail when lock acquisition fails', async () => {
            mockLockManager.acquirePhoneNumberLock.mockResolvedValue(null);

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to acquire lock');
            expect(mockGetOrCreateConversation).not.toHaveBeenCalled();
        });

        it('should fail when conversation cannot be created', async () => {
            mockGetOrCreateConversation.mockResolvedValue(null);

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to get or create conversation');
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });

        it('should fail when user has insufficient credits', async () => {
            mockHasEnoughCredits.mockResolvedValue(false);

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient credits');
            expect(mockCallOpenAI).not.toHaveBeenCalled();
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });

        it('should fail when OpenAI returns no response', async () => {
            mockCallOpenAI.mockResolvedValue({ success: false, error: 'No response from OpenAI' });

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No response from OpenAI');
            expect(mockSendMessage).not.toHaveBeenCalled();
            expect(mockDeductCredits).not.toHaveBeenCalled();
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });

        it('should fail when message sending fails', async () => {
            mockSendMessage.mockResolvedValue({ success: false, error: 'Send failed' });

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to send message: Send failed');
            expect(mockDeductCredits).not.toHaveBeenCalled();
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });

        it('should handle errors gracefully and release lock', async () => {
            mockGetOrCreateConversation.mockRejectedValue(new Error('Database error'));

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });

        it('should not deduct credits if message sending fails', async () => {
            mockSendMessage.mockResolvedValue({ success: false, error: 'Network error' });

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.creditDeducted).toBe(false);
            expect(mockDeductCredits).not.toHaveBeenCalled();
        });

        it('should store both incoming and outgoing messages', async () => {
            await worker.processMessage(testMessage, testLease);

            expect(mockStoreMessage).toHaveBeenCalledTimes(2);
            
            // Check incoming message
            expect(mockStoreMessage).toHaveBeenNthCalledWith(1, {
                message_id: 'msg-123',
                conversation_id: 'conv-123',
                sender: 'user',
                text: 'Hello world',
                status: 'sent',
                sequence_no: expect.any(Number)
            });

            // Check outgoing message
            expect(mockStoreMessage).toHaveBeenNthCalledWith(2, {
                message_id: expect.any(String),
                conversation_id: 'conv-123',
                sender: 'agent',
                text: 'AI response',
                status: 'sent',
                sequence_no: expect.any(Number)
            });
        });
    });

    describe('worker lifecycle', () => {
        it('should start and stop worker', async () => {
            expect(worker.getStatus().isRunning).toBe(false);

            await worker.start();
            expect(worker.getStatus().isRunning).toBe(true);

            await worker.stop();
            expect(worker.getStatus().isRunning).toBe(false);
        });

        it('should not start worker twice', async () => {
            await worker.start();
            await worker.start(); // Second start should be ignored

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Message worker already running',
                { workerId: 'test-worker' }
            );
        });

        it('should return correct status', () => {
            const status = worker.getStatus();
            
            expect(status.workerId).toBe('test-worker');
            expect(status.config).toEqual(defaultWorkerConfig);
            expect(status.isRunning).toBe(false);
        });
    });

    describe('processSingleMessage', () => {
        it('should process single message successfully', async () => {
            const result = await processSingleMessage(testMessage, testLease);

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('msg-123');
            expect(result.creditDeducted).toBe(true);
        });

        it('should handle single message processing errors', async () => {
            mockLockManager.acquirePhoneNumberLock.mockResolvedValue(null);

            const result = await processSingleMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to acquire lock');
        });
    });

    describe('error scenarios', () => {
        it('should handle lock release failure gracefully', async () => {
            mockLockManager.releasePhoneNumberLock.mockRejectedValue(new Error('Lock release failed'));

            const result = await worker.processMessage(testMessage, testLease);

            // Should still succeed despite lock release failure
            expect(result.success).toBe(true);
            expect(mockLogger.error).not.toHaveBeenCalledWith(
                expect.stringContaining('Lock release failed'),
                expect.any(Object)
            );
        });

        it('should handle credit deduction failure', async () => {
            mockDeductCredits.mockRejectedValue(new Error('Credit deduction failed'));

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Credit deduction failed');
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });

        it('should handle message storage failure', async () => {
            mockStoreMessage.mockRejectedValueOnce(new Error('Storage failed'));

            const result = await worker.processMessage(testMessage, testLease);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage failed');
            expect(mockLockManager.releasePhoneNumberLock).toHaveBeenCalled();
        });
    });

    describe('different platform types', () => {
        it('should handle Instagram messages', async () => {
            const instagramMessage = {
                ...testMessage,
                platform_type: 'instagram' as const
            };

            const result = await worker.processMessage(instagramMessage, testLease);

            expect(result.success).toBe(true);
            expect(mockSendMessage).toHaveBeenCalledWith(
                'phone-123',
                'customer-123',
                'AI response',
                'instagram'
            );
        });

        it('should handle WebChat messages', async () => {
            const webchatMessage = {
                ...testMessage,
                platform_type: 'webchat' as const
            };

            const result = await worker.processMessage(webchatMessage, testLease);

            expect(result.success).toBe(true);
            expect(mockSendMessage).toHaveBeenCalledWith(
                'phone-123',
                'customer-123',
                'AI response',
                'webchat'
            );
        });
    });

    describe('auto-scaling functionality', () => {
        it('should return enhanced status with metrics', () => {
            const status = worker.getStatus();
            
            expect(status.isRunning).toBe(false);
            expect(status.workerId).toBe('test-worker');
            expect(status.config).toEqual(defaultWorkerConfig);
            expect(status.metrics).toEqual({
                processedMessages: 0,
                failedMessages: 0,
                uptime: expect.any(Number),
                successRate: 0
            });
        });

        it('should get queue metrics', async () => {
            const metrics = await worker.getQueueMetrics();
            
            expect(metrics).toEqual({
                totalMessages: 25,
                processingMessages: 5,
                failedMessages: 2,
                queuesByPhoneNumber: { 'phone-123': 25 }
            });
        });

        it('should determine scale up condition', async () => {
            // With default config (scaleUpThreshold: 50) and queue having 25 messages
            const shouldScale = await worker.shouldScaleUp();
            expect(shouldScale).toBe(false);

            // Test with lower threshold
            const workerWithLowThreshold = new MessageWorker({
                ...defaultWorkerConfig,
                autoScaling: {
                    ...defaultWorkerConfig.autoScaling!,
                    scaleUpThreshold: 20
                }
            }, 'test-worker-2');

            const shouldScaleWithLowThreshold = await workerWithLowThreshold.shouldScaleUp();
            expect(shouldScaleWithLowThreshold).toBe(true);
        });

        it('should determine scale down condition', async () => {
            // With default config (scaleDownThreshold: 10) and queue having 25 messages
            const shouldScale = await worker.shouldScaleDown();
            expect(shouldScale).toBe(false);

            // Test with higher threshold
            const workerWithHighThreshold = new MessageWorker({
                ...defaultWorkerConfig,
                autoScaling: {
                    ...defaultWorkerConfig.autoScaling!,
                    scaleDownThreshold: 30
                }
            }, 'test-worker-3');

            const shouldScaleWithHighThreshold = await workerWithHighThreshold.shouldScaleDown();
            expect(shouldScaleWithHighThreshold).toBe(true);
        });

        it('should not scale when auto-scaling is disabled', async () => {
            const workerWithoutAutoScaling = new MessageWorker({
                ...defaultWorkerConfig,
                autoScaling: {
                    ...defaultWorkerConfig.autoScaling!,
                    enabled: false
                }
            }, 'test-worker-no-scaling');

            const shouldScaleUp = await workerWithoutAutoScaling.shouldScaleUp();
            const shouldScaleDown = await workerWithoutAutoScaling.shouldScaleDown();

            expect(shouldScaleUp).toBe(false);
            expect(shouldScaleDown).toBe(false);
        });

        it('should update metrics after successful processing', async () => {
            const initialStatus = worker.getStatus();
            expect(initialStatus.metrics.processedMessages).toBe(0);

            await worker.processMessage(testMessage, testLease);

            const updatedStatus = worker.getStatus();
            expect(updatedStatus.metrics.processedMessages).toBe(1);
            expect(updatedStatus.metrics.successRate).toBe(100);
        });

        it('should update metrics after failed processing', async () => {
            mockLockManager.acquirePhoneNumberLock.mockResolvedValue(null);

            const initialStatus = worker.getStatus();
            expect(initialStatus.metrics.failedMessages).toBe(0);

            await worker.processMessage(testMessage, testLease);

            const updatedStatus = worker.getStatus();
            expect(updatedStatus.metrics.failedMessages).toBe(1);
            expect(updatedStatus.metrics.successRate).toBe(0);
        });
    });

    describe('WorkerManager', () => {
        let manager: WorkerManager;

        beforeEach(() => {
            manager = new WorkerManager(defaultWorkerConfig);
        });

        afterEach(async () => {
            if (manager) {
                await manager.stop();
            }
        });

        it('should start with minimum workers', async () => {
            await manager.start();
            
            const status = manager.getStatus();
            expect(status.isRunning).toBe(true);
            expect(status.totalWorkers).toBe(defaultWorkerConfig.autoScaling!.minWorkers);
        });

        it('should add and remove workers', async () => {
            await manager.start();
            
            const initialWorkerCount = manager.getStatus().totalWorkers;
            
            // Add worker
            const workerId = await manager.addWorker();
            expect(workerId).toBeDefined();
            expect(manager.getStatus().totalWorkers).toBe(initialWorkerCount + 1);
            
            // Remove worker
            const removed = await manager.removeWorker(workerId);
            expect(removed).toBe(true);
            expect(manager.getStatus().totalWorkers).toBe(initialWorkerCount);
        });

        it('should not remove non-existent worker', async () => {
            await manager.start();
            
            const removed = await manager.removeWorker('non-existent-worker');
            expect(removed).toBe(false);
        });

        it('should stop all workers when stopped', async () => {
            await manager.start();
            
            const initialStatus = manager.getStatus();
            expect(initialStatus.isRunning).toBe(true);
            expect(initialStatus.totalWorkers).toBeGreaterThan(0);
            
            await manager.stop();
            
            const finalStatus = manager.getStatus();
            expect(finalStatus.isRunning).toBe(false);
            expect(finalStatus.totalWorkers).toBe(0);
        });

        it('should not start twice', async () => {
            await manager.start();
            await manager.start(); // Second start should be ignored
            
            expect(mockLogger.warn).toHaveBeenCalledWith('Worker manager already running');
        });

        it('should provide detailed status', async () => {
            await manager.start();
            
            const status = manager.getStatus();
            expect(status).toEqual({
                isRunning: true,
                totalWorkers: expect.any(Number),
                workers: expect.arrayContaining([
                    expect.objectContaining({
                        workerId: expect.any(String),
                        isRunning: expect.any(Boolean),
                        metrics: expect.objectContaining({
                            processedMessages: expect.any(Number),
                            failedMessages: expect.any(Number),
                            uptime: expect.any(Number),
                            successRate: expect.any(Number)
                        })
                    })
                ])
            });
        });
    });})
;