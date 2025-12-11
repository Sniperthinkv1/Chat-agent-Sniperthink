import { Logger, CorrelationContext, AlertType, AlertSeverity, Alert, PerformanceMetrics } from '../../../src/utils/logger';

describe('CorrelationContext', () => {
    afterEach(() => {
        CorrelationContext.clear();
    });

    it('should set and get correlation ID', () => {
        const correlationId = 'test-correlation-id';
        CorrelationContext.set(correlationId);
        expect(CorrelationContext.get()).toBe(correlationId);
    });

    it('should return undefined when no correlation ID is set', () => {
        expect(CorrelationContext.get()).toBeUndefined();
    });

    it('should clear correlation ID', () => {
        CorrelationContext.set('test-id');
        CorrelationContext.clear();
        expect(CorrelationContext.get()).toBeUndefined();
    });
});

describe('Logger', () => {
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger();
        CorrelationContext.clear();
    });

    describe('Basic Logging', () => {
        it('should log error messages', () => {
            expect(() => {
                logger.error('Test error message', { userId: 'user-123' });
            }).not.toThrow();
        });

        it('should log warn messages', () => {
            expect(() => {
                logger.warn('Test warning message', { userId: 'user-123' });
            }).not.toThrow();
        });

        it('should log info messages', () => {
            expect(() => {
                logger.info('Test info message', { userId: 'user-123' });
            }).not.toThrow();
        });

        it('should log debug messages', () => {
            expect(() => {
                logger.debug('Test debug message', { userId: 'user-123' });
            }).not.toThrow();
        });
    });

    describe('Performance Metrics', () => {
        it('should record performance metrics', () => {
            const metric: PerformanceMetrics = {
                operation: 'test-operation',
                duration: 100,
                success: true,
                timestamp: new Date(),
            };

            logger.recordMetric(metric);
            const metrics = logger.getMetrics('test-operation');
            
            expect(metrics).toHaveLength(1);
            expect(metrics[0].operation).toBe('test-operation');
            expect(metrics[0].duration).toBe(100);
            expect(metrics[0].success).toBe(true);
        });

        it('should calculate average latency', () => {
            logger.recordMetric({
                operation: 'test',
                duration: 100,
                success: true,
                timestamp: new Date(),
            });

            logger.recordMetric({
                operation: 'test',
                duration: 200,
                success: true,
                timestamp: new Date(),
            });

            const avgLatency = logger.getAverageLatency('test');
            expect(avgLatency).toBe(150);
        });

        it('should calculate error rate', () => {
            logger.recordMetric({
                operation: 'test',
                duration: 100,
                success: true,
                timestamp: new Date(),
            });

            logger.recordMetric({
                operation: 'test',
                duration: 100,
                success: false,
                timestamp: new Date(),
            });

            const errorRate = logger.getErrorRate('test');
            expect(errorRate).toBe(0.5);
        });
    });

    describe('Operation Tracking', () => {
        it('should track successful operations', async () => {
            const result = await logger.trackOperation(
                'test-op',
                async () => {
                    return 'success';
                }
            );

            expect(result).toBe('success');
            
            const metrics = logger.getMetrics('test-op');
            expect(metrics).toHaveLength(1);
            expect(metrics[0].success).toBe(true);
        });

        it('should track failed operations', async () => {
            await expect(
                logger.trackOperation(
                    'test-op',
                    async () => {
                        throw new Error('Test error');
                    }
                )
            ).rejects.toThrow('Test error');

            const metrics = logger.getMetrics('test-op');
            expect(metrics).toHaveLength(1);
            expect(metrics[0].success).toBe(false);
        });
    });

    describe('Alert Management', () => {
        it('should trigger alerts', () => {
            const alert: Alert = {
                type: AlertType.EXTRACTION_FAILURE,
                severity: AlertSeverity.MEDIUM,
                message: 'Test alert',
                timestamp: new Date(),
            };

            logger.triggerAlert(alert);
            
            const alerts = logger.getAlerts();
            expect(alerts).toHaveLength(1);
            expect(alerts[0].type).toBe(AlertType.EXTRACTION_FAILURE);
            expect(alerts[0].message).toBe('Test alert');
        });

        it('should filter alerts by type', () => {
            logger.triggerAlert({
                type: AlertType.EXTRACTION_FAILURE,
                severity: AlertSeverity.MEDIUM,
                message: 'Extraction alert',
                timestamp: new Date(),
            });

            logger.triggerAlert({
                type: AlertType.MESSAGE_LOST,
                severity: AlertSeverity.HIGH,
                message: 'Message lost alert',
                timestamp: new Date(),
            });

            const extractionAlerts = logger.getAlerts(undefined, AlertType.EXTRACTION_FAILURE);
            expect(extractionAlerts).toHaveLength(1);
            expect(extractionAlerts[0].type).toBe(AlertType.EXTRACTION_FAILURE);
        });

        it('should call registered alert handlers', () => {
            const handler = jest.fn();
            logger.registerAlertHandler(handler);

            const alert: Alert = {
                type: AlertType.HIGH_ERROR_RATE,
                severity: AlertSeverity.HIGH,
                message: 'High error rate',
                timestamp: new Date(),
            };

            logger.triggerAlert(alert);
            
            expect(handler).toHaveBeenCalledWith(alert);
        });
    });

    describe('Consecutive Failure Detection', () => {
        it('should trigger alert for consecutive extraction failures', () => {
            const alertHandler = jest.fn();
            logger.registerAlertHandler(alertHandler);

            // Record 5 consecutive failures
            for (let i = 0; i < 5; i++) {
                logger.recordMetric({
                    operation: 'extraction-worker',
                    duration: 100,
                    success: false,
                    timestamp: new Date(),
                });
            }

            // Should have triggered extraction failure alert
            const calls = alertHandler.mock.calls;
            const extractionAlerts = calls.filter(
                call => call[0].type === AlertType.EXTRACTION_FAILURE
            );
            
            expect(extractionAlerts.length).toBeGreaterThan(0);
        });
    });

    describe('High Error Rate Detection', () => {
        it('should trigger alert for high error rate', () => {
            const alertHandler = jest.fn();
            logger.registerAlertHandler(alertHandler);

            // Record 6 failures and 4 successes (60% error rate)
            for (let i = 0; i < 6; i++) {
                logger.recordMetric({
                    operation: 'test-op',
                    duration: 100,
                    success: false,
                    timestamp: new Date(),
                });
            }

            for (let i = 0; i < 4; i++) {
                logger.recordMetric({
                    operation: 'test-op',
                    duration: 100,
                    success: true,
                    timestamp: new Date(),
                });
            }

            // Should have triggered high error rate alert
            const calls = alertHandler.mock.calls;
            const errorRateAlerts = calls.filter(
                call => call[0].type === AlertType.HIGH_ERROR_RATE
            );
            
            expect(errorRateAlerts.length).toBeGreaterThan(0);
        });
    });

    describe('Health Status', () => {
        it('should return health status', () => {
            logger.recordMetric({
                operation: 'op1',
                duration: 100,
                success: true,
                timestamp: new Date(),
            });

            logger.recordMetric({
                operation: 'op2',
                duration: 200,
                success: false,
                timestamp: new Date(),
            });

            const health = logger.getHealthStatus();
            
            expect(health.totalMetrics).toBe(2);
            expect(health.operations).toContain('op1');
            expect(health.operations).toContain('op2');
            expect(health.errorRates).toHaveProperty('op1');
            expect(health.errorRates).toHaveProperty('op2');
        });
    });
});
