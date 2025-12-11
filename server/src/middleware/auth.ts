import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { webhookConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * Middleware to validate Meta webhook signatures for WhatsApp and Instagram
 * Both platforms use the same signature validation mechanism
 */
export function validateWebhookSignature(req: Request, res: Response, next: NextFunction): void {
    try {
        // DEVELOPMENT ONLY: Skip signature validation if explicitly disabled
        if (process.env['NODE_ENV'] === 'development' && process.env['SKIP_WEBHOOK_SIGNATURE'] === 'true') {
            logger.warn('⚠️  WEBHOOK SIGNATURE VALIDATION DISABLED - DEVELOPMENT MODE ONLY', { 
                correlationId: req.get('x-correlation-id') || 'unknown'
            });
            next();
            return;
        }

        const signature = req.get('X-Hub-Signature-256');
        const correlationId = req.get('x-correlation-id') || 'unknown';

        if (!signature) {
            logger.warn('Missing webhook signature', { correlationId });
            res.status(401).json({
                error: 'Missing signature',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Get raw body for signature validation
        // The raw body is preserved by the verify function in express.json()
        const rawBody = (req as any).rawBody;
        if (!rawBody) {
            logger.warn('Missing raw body for signature validation', { correlationId });
            res.status(400).json({
                error: 'Missing payload',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validate signature using raw body
        const isValid = verifySignature(rawBody, signature, webhookConfig.secret);
        
        if (!isValid) {
            logger.warn('Invalid webhook signature', { 
                correlationId,
                signatureProvided: signature.substring(0, 20) + '...'
            });
            res.status(401).json({
                error: 'Invalid signature',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        logger.debug('Webhook signature validated successfully', { correlationId });
        next();
    } catch (error) {
        const correlationId = req.get('x-correlation-id') || 'unknown';
        logger.error('Error validating webhook signature', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId 
        });
        
        res.status(500).json({
            error: 'Internal server error',
            correlationId,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Verify webhook signature using HMAC SHA256
 * Used by both WhatsApp and Instagram webhooks
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
        // Remove 'sha256=' prefix if present
        const cleanSignature = signature.replace('sha256=', '');
        
        // Calculate expected signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload, 'utf8')
            .digest('hex');

        // Use timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(cleanSignature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        logger.error('Error in signature verification', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
    }
}

/**
 * API key authentication middleware for REST endpoints
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
    try {
        const apiKey = req.get('x-api-key');
        const correlationId = req.get('x-correlation-id') || 'unknown';

        if (!apiKey) {
            logger.warn('Missing API key', { correlationId });
            res.status(401).json({
                error: 'Missing API key',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // TODO: Implement proper API key validation against database
        // For now, just check if key is provided
        if (apiKey.length < 10) {
            logger.warn('Invalid API key format', { correlationId });
            res.status(401).json({
                error: 'Invalid API key',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        logger.debug('API key validated successfully', { correlationId });
        next();
    } catch (error) {
        const correlationId = req.get('x-correlation-id') || 'unknown';
        logger.error('Error validating API key', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId 
        });
        
        res.status(500).json({
            error: 'Internal server error',
            correlationId,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Credit validation middleware for endpoints that require credit checks
 * Validates that the amount parameter is a positive number
 */
export function validateCreditAmount(req: Request, res: Response, next: NextFunction): void {
    try {
        const { amount } = req.body;
        const correlationId = req.get('x-correlation-id') || 'unknown';

        // Check if amount is provided
        if (amount === undefined || amount === null) {
            logger.warn('Missing credit amount', { correlationId });
            res.status(400).json({
                error: 'Missing amount',
                message: 'Amount is required',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if amount is a number
        if (typeof amount !== 'number' || isNaN(amount)) {
            logger.warn('Invalid credit amount type', { correlationId, amount });
            res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be a number',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if amount is positive
        if (amount <= 0) {
            logger.warn('Non-positive credit amount', { correlationId, amount });
            res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be a positive number',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if amount is an integer
        if (!Number.isInteger(amount)) {
            logger.warn('Non-integer credit amount', { correlationId, amount });
            res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be an integer',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if amount is within reasonable bounds (prevent overflow)
        if (amount > Number.MAX_SAFE_INTEGER) {
            logger.warn('Credit amount exceeds maximum', { correlationId, amount });
            res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount exceeds maximum allowed value',
                correlationId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        logger.debug('Credit amount validated successfully', { correlationId, amount });
        next();
    } catch (error) {
        const correlationId = req.get('x-correlation-id') || 'unknown';
        logger.error('Error validating credit amount', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId 
        });
        
        res.status(500).json({
            error: 'Internal server error',
            correlationId,
            timestamp: new Date().toISOString()
        });
    }
}