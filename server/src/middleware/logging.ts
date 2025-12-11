import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Middleware to add correlation ID to requests
 * Generates a new UUID if not provided in headers
 */
export function addCorrelationId(req: Request, res: Response, next: NextFunction): void {
    const correlationId = req.get('x-correlation-id') || uuidv4();
    
    // Add correlation ID to request headers for downstream use
    req.headers['x-correlation-id'] = correlationId;
    
    // Add correlation ID to response headers
    res.set('x-correlation-id', correlationId);
    
    next();
}

/**
 * Middleware to log incoming requests
 */
export function logRequest(req: Request, res: Response, next: NextFunction): void {
    const correlationId = req.get('x-correlation-id') || 'unknown';
    const startTime = Date.now();

    // Log incoming request
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        correlationId,
        timestamp: new Date().toISOString()
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger[logLevel]('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            correlationId,
            timestamp: new Date().toISOString()
        });
    });

    next();
}

/**
 * Middleware to log webhook payloads for debugging
 * Only logs in development environment to avoid sensitive data in production logs
 */
export function logWebhookPayload(req: Request, _res: Response, next: NextFunction): void {
    const correlationId = req.get('x-correlation-id') || 'unknown';
    
    // Only log webhook payloads in development
    if (process.env['NODE_ENV'] === 'development') {
        logger.debug('Webhook payload received', {
            headers: {
                'x-hub-signature-256': req.get('X-Hub-Signature-256'),
                'content-type': req.get('Content-Type'),
                'user-agent': req.get('User-Agent')
            },
            body: req.body,
            correlationId
        });
    } else {
        // In production, only log metadata
        logger.info('Webhook payload received', {
            contentType: req.get('Content-Type'),
            contentLength: req.get('Content-Length'),
            hasSignature: !!req.get('X-Hub-Signature-256'),
            correlationId
        });
    }

    next();
}

/**
 * Middleware to sanitize sensitive data from logs
 */
export function sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sensitiveFields = [
        'access_token',
        'api_key',
        'password',
        'secret',
        'authorization',
        'x-api-key'
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeLogData(sanitized[key]);
        }
    }

    return sanitized;
}

/**
 * Error logging middleware
 */
export function logError(error: Error, req: Request, _res: Response, next: NextFunction): void {
    const correlationId = req.get('x-correlation-id') || 'unknown';
    
    logger.error('Request error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        correlationId,
        timestamp: new Date().toISOString()
    });

    next(error);
}