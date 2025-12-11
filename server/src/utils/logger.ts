import winston from 'winston';
import { appConfig } from '../config';

// Correlation ID storage for async context
export class CorrelationContext {
    private static storage = new Map<string, string>();

    static set(correlationId: string): void {
        this.storage.set('current', correlationId);
    }

    static get(): string | undefined {
        return this.storage.get('current');
    }

    static clear(): void {
        this.storage.delete('current');
    }
}

// Log levels
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}

// Structured log metadata
// Note: With exactOptionalPropertyTypes: true, we explicitly allow undefined
// This enables passing potentially undefined values without type errors
export interface LogMetadata {
    correlationId?: string | undefined;
    userId?: string | undefined;
    phoneNumberId?: string | undefined;
    conversationId?: string | undefined;
    messageId?: string | undefined;
    agentId?: string | undefined;
    duration?: number | undefined;
    error?: Error | string | unknown;
    [key: string]: any;
}

// Performance metrics
export interface PerformanceMetrics {
    operation: string;
    duration: number;
    success: boolean;
    timestamp: Date;
    metadata?: Record<string, any>;
}

// Alert types
export enum AlertType {
    EXTRACTION_FAILURE = 'extraction_failure',
    MESSAGE_LOST = 'message_lost',
    HIGH_ERROR_RATE = 'high_error_rate',
    QUEUE_OVERFLOW = 'queue_overflow',
    WORKER_CRASH = 'worker_crash',
    API_FAILURE = 'api_failure',
}

// Alert severity
export enum AlertSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

// Alert interface
export interface Alert {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}

// Metrics storage
class MetricsCollector {
    private metrics: PerformanceMetrics[] = [];
    private errorCounts: Map<string, number> = new Map();
    private consecutiveFailures: Map<string, number> = new Map();
    private readonly maxMetricsSize = 10000;

    recordMetric(metric: PerformanceMetrics): void {
        this.metrics.push(metric);
        
        // Keep metrics array bounded
        if (this.metrics.length > this.maxMetricsSize) {
            this.metrics.shift();
        }

        // Track errors
        if (!metric.success) {
            const key = metric.operation;
            this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
            this.consecutiveFailures.set(key, (this.consecutiveFailures.get(key) || 0) + 1);
        } else {
            // Reset consecutive failures on success
            this.consecutiveFailures.set(metric.operation, 0);
        }
    }

    getMetrics(operation?: string, since?: Date): PerformanceMetrics[] {
        let filtered = this.metrics;

        if (operation) {
            filtered = filtered.filter(m => m.operation === operation);
        }

        if (since) {
            filtered = filtered.filter(m => m.timestamp >= since);
        }

        return filtered;
    }

    getAverageLatency(operation: string, windowMs: number = 60000): number {
        const since = new Date(Date.now() - windowMs);
        const metrics = this.getMetrics(operation, since);
        
        if (metrics.length === 0) return 0;
        
        const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
        return sum / metrics.length;
    }

    getThroughput(operation: string, windowMs: number = 60000): number {
        const since = new Date(Date.now() - windowMs);
        const metrics = this.getMetrics(operation, since);
        return (metrics.length / windowMs) * 1000; // per second
    }

    getErrorRate(operation: string, windowMs: number = 60000): number {
        const since = new Date(Date.now() - windowMs);
        const metrics = this.getMetrics(operation, since);
        
        if (metrics.length === 0) return 0;
        
        const errors = metrics.filter(m => !m.success).length;
        return errors / metrics.length;
    }

    getConsecutiveFailures(operation: string): number {
        return this.consecutiveFailures.get(operation) || 0;
    }

    resetConsecutiveFailures(operation: string): void {
        this.consecutiveFailures.set(operation, 0);
    }

    clearOldMetrics(olderThanMs: number = 3600000): void {
        const cutoff = new Date(Date.now() - olderThanMs);
        this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    }

    getHealthStatus(): {
        totalMetrics: number;
        operations: string[];
        errorRates: Record<string, number>;
        avgLatencies: Record<string, number>;
        throughputs: Record<string, number>;
    } {
        const operations = [...new Set(this.metrics.map(m => m.operation))];
        const errorRates: Record<string, number> = {};
        const avgLatencies: Record<string, number> = {};
        const throughputs: Record<string, number> = {};

        operations.forEach(op => {
            errorRates[op] = this.getErrorRate(op);
            avgLatencies[op] = this.getAverageLatency(op);
            throughputs[op] = this.getThroughput(op);
        });

        return {
            totalMetrics: this.metrics.length,
            operations,
            errorRates,
            avgLatencies,
            throughputs,
        };
    }
}

// Alert manager
class AlertManager {
    private alerts: Alert[] = [];
    private readonly maxAlertsSize = 1000;
    private alertHandlers: Array<(alert: Alert) => void> = [];

    registerHandler(handler: (alert: Alert) => void): void {
        this.alertHandlers.push(handler);
    }

    triggerAlert(alert: Alert): void {
        this.alerts.push(alert);
        
        // Keep alerts array bounded
        if (this.alerts.length > this.maxAlertsSize) {
            this.alerts.shift();
        }

        // Notify all handlers
        this.alertHandlers.forEach(handler => {
            try {
                handler(alert);
            } catch (error) {
                // Don't let handler errors break alerting
                console.error('Alert handler error:', error);
            }
        });
    }

    getAlerts(since?: Date, type?: AlertType): Alert[] {
        let filtered = this.alerts;

        if (since) {
            filtered = filtered.filter(a => a.timestamp >= since);
        }

        if (type) {
            filtered = filtered.filter(a => a.type === type);
        }

        return filtered;
    }

    clearAlerts(olderThanMs: number = 86400000): void {
        const cutoff = new Date(Date.now() - olderThanMs);
        this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
    }
}

// Winston logger configuration
const createWinstonLogger = (): winston.Logger => {
    const format = appConfig.logFormat === 'json'
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
        );

    return winston.createLogger({
        level: appConfig.logLevel,
        format,
        transports: [
            new winston.transports.Console(),
        ],
    });
};

// Main logger class
export class Logger {
    private winstonLogger: winston.Logger;
    private metricsCollector: MetricsCollector;
    private alertManager: AlertManager;

    constructor() {
        this.winstonLogger = createWinstonLogger();
        this.metricsCollector = new MetricsCollector();
        this.alertManager = new AlertManager();

        // Register default alert handler (log to winston)
        this.alertManager.registerHandler((alert: Alert) => {
            this.winstonLogger.warn('ALERT', {
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                metadata: alert.metadata,
                timestamp: alert.timestamp,
            });
        });
    }

    private enrichMetadata(metadata?: LogMetadata): Record<string, any> {
        const correlationId = metadata?.correlationId || CorrelationContext.get();
        
        // Start with timestamp
        const enriched: Record<string, any> = {
            timestamp: new Date().toISOString(),
        };
        
        // Add correlation ID if available
        if (correlationId) {
            enriched['correlationId'] = correlationId;
        }
        
        // Add all metadata, filtering out undefined values and converting errors
        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                if (value === undefined) {
                    continue; // Skip undefined values
                }
                
                // Convert error objects to proper format
                if (key === 'error') {
                    enriched[key] = toErrorType(value);
                } else {
                    enriched[key] = value;
                }
            }
        }
        
        return enriched;
    }

    error(message: string, metadata?: LogMetadata): void {
        this.winstonLogger.error(message, this.enrichMetadata(metadata));
    }

    warn(message: string, metadata?: LogMetadata): void {
        this.winstonLogger.warn(message, this.enrichMetadata(metadata));
    }

    info(message: string, metadata?: LogMetadata): void {
        this.winstonLogger.info(message, this.enrichMetadata(metadata));
    }

    debug(message: string, metadata?: LogMetadata): void {
        this.winstonLogger.debug(message, this.enrichMetadata(metadata));
    }

    // Performance tracking
    startTimer(_operation: string): () => void {
        const startTime = Date.now();
        return () => {
            const duration = Date.now() - startTime;
            return duration;
        };
    }

    recordMetric(metric: PerformanceMetrics): void {
        this.metricsCollector.recordMetric(metric);
        
        // Log slow operations
        if (metric.duration > 5000) {
            this.warn('Slow operation detected', {
                operation: metric.operation,
                duration: metric.duration,
                success: metric.success,
                ...metric.metadata,
            });
        }

        // Check for high error rates
        const errorRate = this.metricsCollector.getErrorRate(metric.operation);
        if (errorRate > 0.5) { // 50% error rate
            this.triggerAlert({
                type: AlertType.HIGH_ERROR_RATE,
                severity: AlertSeverity.HIGH,
                message: `High error rate detected for ${metric.operation}: ${(errorRate * 100).toFixed(2)}%`,
                metadata: { operation: metric.operation, errorRate },
                timestamp: new Date(),
            });
        }

        // Check for consecutive failures
        if (!metric.success) {
            const consecutiveFailures = this.metricsCollector.getConsecutiveFailures(metric.operation);
            
            if (consecutiveFailures >= 5 && metric.operation.includes('extraction')) {
                this.triggerAlert({
                    type: AlertType.EXTRACTION_FAILURE,
                    severity: AlertSeverity.MEDIUM,
                    message: `${consecutiveFailures} consecutive extraction failures`,
                    metadata: { operation: metric.operation, consecutiveFailures },
                    timestamp: new Date(),
                });
            }
        }
    }

    // Convenience method for tracking operations
    async trackOperation<T>(
        operation: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        const startTime = Date.now();
        let success = false;
        let error: Error | undefined;

        try {
            const result = await fn();
            success = true;
            return result;
        } catch (err) {
            error = err as Error;
            throw err;
        } finally {
            const duration = Date.now() - startTime;
            this.recordMetric({
                operation,
                duration,
                success,
                timestamp: new Date(),
                metadata: {
                    ...metadata,
                    error: error?.message,
                },
            });
        }
    }

    // Alert management
    triggerAlert(alert: Alert): void {
        this.alertManager.triggerAlert(alert);
    }

    registerAlertHandler(handler: (alert: Alert) => void): void {
        this.alertManager.registerHandler(handler);
    }

    getAlerts(since?: Date, type?: AlertType): Alert[] {
        return this.alertManager.getAlerts(since, type);
    }

    // Metrics retrieval
    getMetrics(operation?: string, since?: Date): PerformanceMetrics[] {
        return this.metricsCollector.getMetrics(operation, since);
    }

    getAverageLatency(operation: string, windowMs?: number): number {
        return this.metricsCollector.getAverageLatency(operation, windowMs);
    }

    getThroughput(operation: string, windowMs?: number): number {
        return this.metricsCollector.getThroughput(operation, windowMs);
    }

    getErrorRate(operation: string, windowMs?: number): number {
        return this.metricsCollector.getErrorRate(operation, windowMs);
    }

    getHealthStatus(): any {
        return this.metricsCollector.getHealthStatus();
    }

    // Cleanup
    cleanup(metricsOlderThanMs?: number, alertsOlderThanMs?: number): void {
        this.metricsCollector.clearOldMetrics(metricsOlderThanMs);
        this.alertManager.clearAlerts(alertsOlderThanMs);
    }
}

// Export singleton instance
export const logger = new Logger();

// Helper function to safely convert unknown errors to Error or string
export function toErrorType(error: unknown): Error | string {
    if (error instanceof Error) {
        return error;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object') {
        // Handle error-like objects with message property
        if ('message' in error && typeof error.message === 'string') {
            return error.message;
        }
        // Try to stringify objects
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
    return String(error);
}

// Helper function to ensure metadata has proper types
export function sanitizeMetadata(metadata: Record<string, any>): LogMetadata {
    const sanitized: LogMetadata = {};
    
    for (const [key, value] of Object.entries(metadata)) {
        if (value === undefined) {
            continue; // Skip undefined values
        }
        if (key === 'error' && value !== undefined) {
            sanitized.error = toErrorType(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}
