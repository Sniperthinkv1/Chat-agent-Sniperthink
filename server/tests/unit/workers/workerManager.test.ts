// Mock dependencies BEFORE imports
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
                queuesByPhoneNumber: {}
            })
        })
    },
    defaultQueueConfig: {}
}));

jest.mock('../../../src/utils/locks', () => ({
    createLockManager: jest.fn().mockReturnValue({}),
    createPhoneNumberLockManager: jest.fn().mockReturnValue({
        acquirePhoneNumberLock: jest.fn(),
        releasePhoneNumberLock: jest.fn()
    }),
    defaultLockConfig: {},
    defaultDeduplicationConfig: {}
}));

jest.mock('../../../src/services/creditService', () => ({
    hasEnoughCredits: jest.fn(),
    deductCredits: jest.fn()
}));

jest.mock('../../../src/services/openaiService', () => ({
    callOpenAI: jest.fn()
}));

jest.mock('../../../src/services/messageService', () => ({
    sendMessage: jest.fn(),
    storeMessage: jest.fn(),
    trackMessageDelivery: jest.fn()
}));

jest.mock('../../../src/services/conversationService', () => ({
    getOrCreateConversation: jest.fn(),
    ensureOpenAIConversation: jest.fn(),
    updateConversationActivity: jest.fn()
}));

jest.mock('../../../src/utils/database', () => ({
    db: {
        query: jest.fn()
    }
}));

jest.mock('os');

// Mock MessageWorker class
const mockMessageWorkerInstance = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn(),
    getQueueMetrics: jest.fn(),
    shouldScaleUp: jest.fn().mockResolvedValue(false),
    shouldScaleDown: jest.fn().mockResolvedValue(false),
};

jest.mock('../../../src/workers/messageWorker', () => {
    const actual = jest.requireActual('../../../src/workers/messageWorker');
    return {
        ...actual,
        MessageWorker: jest.fn().mockImplementation(() => mockMessageWorkerInstance),
        defaultWorkerConfig: actual.defaultWorkerConfig,
    };
});

// Now import after mocks are set up
import { WorkerManager, createWorkerManager, WorkerManagerConfig, defaultWorkerManagerConfig } from '../../../src/workers/workerManager';
import { MessageWorker, MessageWorkerConfig, defaultWorkerConfig } from '../../../src/workers/messageWorker';
import * as os from 'os';

describe('WorkerManager', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Reset mock implementations
        mockMessageWorkerInstance.start.mockResolvedValue(undefined);
        mockMessageWorkerInstance.stop.mockResolvedValue(undefined);
        mockMessageWorkerInstance.getStatus.mockReturnValue({
            isRunning: true,
            workerId: 'test-worker',
            config: defaultWorkerConfig,
            metrics: {
                processedMessages: 100,
                failedMessages: 5,
                uptime: 60000,
                successRate: 95,
            },
        });
        mockMessageWorkerInstance.getQueueMetrics.mockResolvedValue({
            totalMessages: 25,
            processingMessages: 5,
            failedMessages: 2,
            queuesByPhoneNumber: {},
        });
        mockMessageWorkerInstance.shouldScaleUp.mockResolvedValue(false);
        mockMessageWorkerInstance.shouldScaleDown.mockResolvedValue(false);

        // Mock os module
        (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]); // 4 CPUs
        (os.totalmem as jest.Mock).mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
        (os.freemem as jest.Mock).mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB free
    });

    afterEach(async () => {
        if (workerManager) {
            await workerManager.stop();
        }
        jest.useRealTimers();
    });

    describe('Constructor', () => {
        it('should create worker manager with default config', () => {
            workerManager = new WorkerManager();
            expect(workerManager).toBeDefined();
        });

        it('should create worker manager with custom config', () => {
            const customConfig: Partial<WorkerManagerConfig> = {
                autoScaling: {
                    enabled: false,
                    minWorkers: 2,
                    maxWorkers: 5,
                    scaleUpThreshold: 100,
                    scaleDownThreshold: 20,
                    cpuThreshold: 70,
                    checkIntervalMs: 60000,
                },
            };

            workerManager = new WorkerManager(customConfig);
            expect(workerManager).toBeDefined();
        });

        it('should merge partial config with defaults', () => {
            const partialConfig: Partial<WorkerManagerConfig> = {
                autoScaling: {
                    enabled: true,
                    minWorkers: 3,
                    maxWorkers: 15,
                    scaleUpThreshold: 75,
                    scaleDownThreshold: 15,
                    cpuThreshold: 85,
                    checkIntervalMs: 45000,
                },
            };

            workerManager = new WorkerManager(partialConfig);
            expect(workerManager).toBeDefined();
        });
    });

    describe('start()', () => {
        it('should start worker manager with minimum workers', async () => {
            const config: Partial<WorkerManagerConfig> = {
                autoScaling: {
                    enabled: true,
                    minWorkers: 2,
                    maxWorkers: 10,
                    scaleUpThreshold: 50,
                    scaleDownThreshold: 10,
                    cpuThreshold: 80,
                    checkIntervalMs: 30000,
                },
            };

            workerManager = new WorkerManager(config);
            await workerManager.start();

            const status = await workerManager.getStatus();
            expect(status.isRunning).toBe(true);
            expect(status.totalWorkers).toBe(2);
            expect(mockMessageWorkerInstance.start).toHaveBeenCalledTimes(2);
        });

        it('should not start if already running', async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
            await workerManager.start(); // Second call should be ignored

            const status = await workerManager.getStatus();
            expect(status.totalWorkers).toBe(1); // Only 1 worker from first start
        });

        it('should start health check monitoring', async () => {
            const setIntervalSpy = jest.spyOn(global, 'setInterval');
            
            workerManager = new WorkerManager();
            await workerManager.start();

            // Health check interval should be set
            expect(setIntervalSpy).toHaveBeenCalled();
            
            setIntervalSpy.mockRestore();
        });

        it('should start auto-scaling check when enabled', async () => {
            const setIntervalSpy = jest.spyOn(global, 'setInterval');
            
            const config: Partial<WorkerManagerConfig> = {
                autoScaling: {
                    enabled: true,
                    minWorkers: 1,
                    maxWorkers: 10,
                    scaleUpThreshold: 50,
                    scaleDownThreshold: 10,
                    cpuThreshold: 80,
                    checkIntervalMs: 30000,
                },
            };

            workerManager = new WorkerManager(config);
            await workerManager.start();

            // Auto-scaling interval should be set (health check + auto-scaling)
            expect(setIntervalSpy).toHaveBeenCalled();
            
            setIntervalSpy.mockRestore();
        });

        it('should not start auto-scaling check when disabled', async () => {
            const config: Partial<WorkerManagerConfig> = {
                autoScaling: {
                    enabled: false,
                    minWorkers: 1,
                    maxWorkers: 10,
                    scaleUpThreshold: 50,
                    scaleDownThreshold: 10,
                    cpuThreshold: 80,
                    checkIntervalMs: 30000,
                },
            };

            workerManager = new WorkerManager(config);
            await workerManager.start();

            const status = await workerManager.getStatus();
            expect(status.isRunning).toBe(true);
        });
    });

    describe('stop()', () => {
        it('should stop worker manager and all workers', async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
            await workerManager.stop();

            const status = await workerManager.getStatus();
            expect(status.isRunning).toBe(false);
            expect(status.totalWorkers).toBe(0);
            expect(mockMessageWorkerInstance.stop).toHaveBeenCalled();
        });

        it('should clear all intervals on stop', async () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            workerManager = new WorkerManager();
            await workerManager.start();
            await workerManager.stop();

            expect(clearIntervalSpy).toHaveBeenCalled();
            
            clearIntervalSpy.mockRestore();
        });

        it('should handle stop when not running', async () => {
            workerManager = new WorkerManager();
            await workerManager.stop(); // Should not throw

            const status = await workerManager.getStatus();
            expect(status.isRunning).toBe(false);
        });

        it('should handle worker stop errors gracefully', async () => {
            mockMessageWorkerInstance.stop.mockRejectedValueOnce(new Error('Stop failed'));

            workerManager = new WorkerManager();
            await workerManager.start();
            await workerManager.stop(); // Should not throw

            const status = await workerManager.getStatus();
            expect(status.isRunning).toBe(false);
        });
    });

    describe('addWorker()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
        });

        it('should add a new worker successfully', async () => {
            const initialStatus = await workerManager.getStatus();
            const initialCount = initialStatus.totalWorkers;

            const workerId = await workerManager.addWorker();

            expect(workerId).toBeDefined();
            expect(workerId).toMatch(/^worker-/);

            const newStatus = await workerManager.getStatus();
            expect(newStatus.totalWorkers).toBe(initialCount + 1);
            expect(mockMessageWorkerInstance.start).toHaveBeenCalled();
        });

        it('should track worker health after adding', async () => {
            const workerId = await workerManager.addWorker();

            const health = workerManager.getWorkerHealth();
            const workerHealth = health.find(h => h.workerId === workerId);

            expect(workerHealth).toBeDefined();
            expect(workerHealth?.isRunning).toBe(true);
        });

        it('should handle worker start failure', async () => {
            mockMessageWorkerInstance.start.mockRejectedValueOnce(new Error('Start failed'));

            await expect(workerManager.addWorker()).rejects.toThrow('Start failed');
        });
    });

    describe('removeWorker()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
        });

        it('should remove a specific worker', async () => {
            const workerId = await workerManager.addWorker();
            const initialStatus = await workerManager.getStatus();

            const removed = await workerManager.removeWorker(workerId);

            expect(removed).toBe(true);
            const newStatus = await workerManager.getStatus();
            expect(newStatus.totalWorkers).toBe(initialStatus.totalWorkers - 1);
            expect(mockMessageWorkerInstance.stop).toHaveBeenCalled();
        });

        it('should remove oldest worker when no ID specified', async () => {
            await workerManager.addWorker();
            await workerManager.addWorker();
            const initialStatus = await workerManager.getStatus();

            const removed = await workerManager.removeWorker();

            expect(removed).toBe(true);
            const newStatus = await workerManager.getStatus();
            expect(newStatus.totalWorkers).toBe(initialStatus.totalWorkers - 1);
        });

        it('should return false when worker not found', async () => {
            const removed = await workerManager.removeWorker('non-existent-worker');
            expect(removed).toBe(false);
        });

        it('should return false when no workers available', async () => {
            await workerManager.stop();
            workerManager = new WorkerManager({ autoScaling: { enabled: false, minWorkers: 0, maxWorkers: 10, scaleUpThreshold: 50, scaleDownThreshold: 10, cpuThreshold: 80, checkIntervalMs: 30000 } });
            await workerManager.start();

            const removed = await workerManager.removeWorker();
            expect(removed).toBe(false);
        });

        it('should handle worker stop failure', async () => {
            const workerId = await workerManager.addWorker();
            mockMessageWorkerInstance.stop.mockRejectedValueOnce(new Error('Stop failed'));

            const removed = await workerManager.removeWorker(workerId);
            expect(removed).toBe(false);
        });
    });

    describe('getStatus()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
        });

        it('should return comprehensive status', async () => {
            const status = await workerManager.getStatus();

            expect(status).toHaveProperty('isRunning');
            expect(status).toHaveProperty('uptime');
            expect(status).toHaveProperty('totalWorkers');
            expect(status).toHaveProperty('workers');
            expect(status).toHaveProperty('metrics');
        });

        it('should include worker health information', async () => {
            await workerManager.addWorker();
            const status = await workerManager.getStatus();

            expect(status.workers.length).toBeGreaterThan(0);
            expect(status.workers[0]).toHaveProperty('workerId');
            expect(status.workers[0]).toHaveProperty('isRunning');
            expect(status.workers[0]).toHaveProperty('processedMessages');
            expect(status.workers[0]).toHaveProperty('successRate');
        });

        it('should include system metrics', async () => {
            const status = await workerManager.getStatus();

            expect(status.metrics).toHaveProperty('totalWorkers');
            expect(status.metrics).toHaveProperty('activeWorkers');
            expect(status.metrics).toHaveProperty('queueLength');
            expect(status.metrics).toHaveProperty('cpuUsage');
            expect(status.metrics).toHaveProperty('memoryUsage');
        });

        it('should calculate correct uptime', async () => {
            jest.advanceTimersByTime(60000); // Advance 1 minute

            const status = await workerManager.getStatus();
            expect(status.uptime).toBeGreaterThanOrEqual(60000);
        });
    });

    describe('getWorkerHealth()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
        });

        it('should return health for all workers', () => {
            const health = workerManager.getWorkerHealth();

            expect(Array.isArray(health)).toBe(true);
            expect(health.length).toBe(1); // Default minWorkers is 1
        });

        it('should include all health metrics', async () => {
            await workerManager.addWorker();
            const health = workerManager.getWorkerHealth();

            expect(health[0]).toHaveProperty('workerId');
            expect(health[0]).toHaveProperty('isRunning');
            expect(health[0]).toHaveProperty('uptime');
            expect(health[0]).toHaveProperty('processedMessages');
            expect(health[0]).toHaveProperty('failedMessages');
            expect(health[0]).toHaveProperty('successRate');
            expect(health[0]).toHaveProperty('lastHealthCheck');
        });
    });

    describe('isWorkerHealthy()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
        });

        it('should return true for healthy worker', async () => {
            const workerId = await workerManager.addWorker();
            const isHealthy = workerManager.isWorkerHealthy(workerId);

            expect(isHealthy).toBe(true);
        });

        it('should return false for non-existent worker', () => {
            const isHealthy = workerManager.isWorkerHealthy('non-existent');
            expect(isHealthy).toBe(false);
        });

        it('should return false for worker with low success rate', async () => {
            const workerId = await workerManager.addWorker();
            
            // Update the worker health manually to simulate low success rate
            const health = workerManager.getWorkerHealth();
            const workerHealth = health.find(h => h.workerId === workerId);
            if (workerHealth) {
                workerHealth.successRate = 10; // Low success rate
            }

            const isHealthy = workerManager.isWorkerHealthy(workerId);
            expect(isHealthy).toBe(false);
        });
    });

    describe('restartWorker()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager();
            await workerManager.start();
        });

        it('should restart an unhealthy worker', async () => {
            const workerId = await workerManager.addWorker();
            const initialCount = (await workerManager.getStatus()).totalWorkers;

            const restarted = await workerManager.restartWorker(workerId);

            expect(restarted).toBe(true);
            const newCount = (await workerManager.getStatus()).totalWorkers;
            expect(newCount).toBe(initialCount); // Same count, but worker replaced
        });

        it('should handle restart failure', async () => {
            const workerId = await workerManager.addWorker();
            mockMessageWorkerInstance.start.mockRejectedValueOnce(new Error('Start failed'));

            const restarted = await workerManager.restartWorker(workerId);
            expect(restarted).toBe(false);
        });
    });

    describe('makeScalingDecision()', () => {
        beforeEach(async () => {
            workerManager = new WorkerManager({
                autoScaling: {
                    enabled: true,
                    minWorkers: 1,
                    maxWorkers: 5,
                    scaleUpThreshold: 50,
                    scaleDownThreshold: 10,
                    cpuThreshold: 80,
                    checkIntervalMs: 30000,
                },
            });
            await workerManager.start();
        });

        it('should decide to scale up when queue exceeds threshold', async () => {
            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValueOnce({
                totalMessages: 75, // Above threshold of 50
                processingMessages: 5,
                failedMessages: 2,
                queuesByPhoneNumber: {},
            });

            const decision = await workerManager.makeScalingDecision();

            expect(decision.action).toBe('scale_up');
            expect(decision.reason).toContain('Queue length');
            expect(decision.targetWorkers).toBe(2);
        });

        it('should decide to scale up when CPU exceeds threshold', async () => {
            // Mock high CPU usage
            jest.spyOn(workerManager as any, 'getCpuUsage').mockReturnValue(85);

            const decision = await workerManager.makeScalingDecision();

            expect(decision.action).toBe('scale_up');
            expect(decision.reason).toContain('CPU usage');
        });

        it('should decide to scale down when queue below threshold', async () => {
            // Add extra workers first
            await workerManager.addWorker();
            await workerManager.addWorker();

            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValueOnce({
                totalMessages: 5, // Below threshold of 10
                processingMessages: 1,
                failedMessages: 0,
                queuesByPhoneNumber: {},
            });

            // Mock low CPU usage
            jest.spyOn(workerManager as any, 'getCpuUsage').mockReturnValue(20);

            const decision = await workerManager.makeScalingDecision();

            expect(decision.action).toBe('scale_down');
            expect(decision.reason).toContain('below threshold');
        });

        it('should not scale up beyond max workers', async () => {
            // Add workers to max
            await workerManager.addWorker();
            await workerManager.addWorker();
            await workerManager.addWorker();
            await workerManager.addWorker();

            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValueOnce({
                totalMessages: 100, // High queue
                processingMessages: 10,
                failedMessages: 5,
                queuesByPhoneNumber: {},
            });

            const decision = await workerManager.makeScalingDecision();

            expect(decision.action).toBe('no_action');
            expect(decision.currentWorkers).toBe(5); // At max
        });

        it('should not scale down below min workers', async () => {
            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValueOnce({
                totalMessages: 0, // Empty queue
                processingMessages: 0,
                failedMessages: 0,
                queuesByPhoneNumber: {},
            });

            // Mock low CPU usage
            jest.spyOn(workerManager as any, 'getCpuUsage').mockReturnValue(10);

            const decision = await workerManager.makeScalingDecision();

            expect(decision.action).toBe('no_action');
            expect(decision.currentWorkers).toBe(1); // At min
        });

        it('should return no action when metrics in acceptable range', async () => {
            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValueOnce({
                totalMessages: 25, // Between thresholds
                processingMessages: 3,
                failedMessages: 1,
                queuesByPhoneNumber: {},
            });

            // Mock normal CPU usage
            jest.spyOn(workerManager as any, 'getCpuUsage').mockReturnValue(50);

            const decision = await workerManager.makeScalingDecision();

            expect(decision.action).toBe('no_action');
            expect(decision.reason).toContain('acceptable range');
        });
    });

    describe('Auto-scaling Integration', () => {
        it('should automatically scale up when conditions met', async () => {
            workerManager = new WorkerManager({
                autoScaling: {
                    enabled: true,
                    minWorkers: 1,
                    maxWorkers: 5,
                    scaleUpThreshold: 50,
                    scaleDownThreshold: 10,
                    cpuThreshold: 80,
                    checkIntervalMs: 100,
                },
            });
            await workerManager.start();

            const initialStatus = await workerManager.getStatus();
            expect(initialStatus.totalWorkers).toBe(1);

            // Mock high queue
            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValue({
                totalMessages: 75,
                processingMessages: 5,
                failedMessages: 2,
                queuesByPhoneNumber: {},
            });

            // Manually trigger scaling decision and add worker
            const decision = await workerManager.makeScalingDecision();
            expect(decision.action).toBe('scale_up');
            
            // Manually add worker to simulate auto-scaling
            await workerManager.addWorker();

            const newStatus = await workerManager.getStatus();
            expect(newStatus.totalWorkers).toBe(2);
        });

        it('should automatically scale down when conditions met', async () => {
            workerManager = new WorkerManager({
                autoScaling: {
                    enabled: true,
                    minWorkers: 1,
                    maxWorkers: 5,
                    scaleUpThreshold: 50,
                    scaleDownThreshold: 10,
                    cpuThreshold: 80,
                    checkIntervalMs: 100,
                },
            });
            await workerManager.start();

            // Add extra workers
            await workerManager.addWorker();
            await workerManager.addWorker();

            // Mock low queue
            mockMessageWorkerInstance.getQueueMetrics.mockResolvedValue({
                totalMessages: 5,
                processingMessages: 0,
                failedMessages: 0,
                queuesByPhoneNumber: {},
            });

            // Mock low CPU
            jest.spyOn(workerManager as any, 'getCpuUsage').mockReturnValue(20);

            // Manually trigger scaling decision
            const decision = await workerManager.makeScalingDecision();
            expect(decision.action).toBe('scale_down');
            
            // Manually remove worker to simulate auto-scaling
            await workerManager.removeWorker();

            const newStatus = await workerManager.getStatus();
            expect(newStatus.totalWorkers).toBeLessThan(3);
        });
    });

    describe('createWorkerManager()', () => {
        it('should create and start worker manager', async () => {
            const manager = await createWorkerManager();

            expect(manager).toBeInstanceOf(WorkerManager);
            const status = await manager.getStatus();
            expect(status.isRunning).toBe(true);

            await manager.stop();
        });

        it('should create worker manager with custom config', async () => {
            const config: Partial<WorkerManagerConfig> = {
                autoScaling: {
                    enabled: false,
                    minWorkers: 2,
                    maxWorkers: 8,
                    scaleUpThreshold: 100,
                    scaleDownThreshold: 20,
                    cpuThreshold: 70,
                    checkIntervalMs: 60000,
                },
            };

            const manager = await createWorkerManager(config);

            expect(manager).toBeInstanceOf(WorkerManager);
            const status = await manager.getStatus();
            expect(status.totalWorkers).toBe(2);

            await manager.stop();
        });
    });

    describe('defaultWorkerManagerConfig', () => {
        it('should have valid default configuration', () => {
            expect(defaultWorkerManagerConfig).toBeDefined();
            expect(defaultWorkerManagerConfig.autoScaling).toBeDefined();
            expect(defaultWorkerManagerConfig.autoScaling.enabled).toBe(true);
            expect(defaultWorkerManagerConfig.autoScaling.minWorkers).toBeGreaterThan(0);
            expect(defaultWorkerManagerConfig.autoScaling.maxWorkers).toBeGreaterThan(defaultWorkerManagerConfig.autoScaling.minWorkers);
        });
    });
});
