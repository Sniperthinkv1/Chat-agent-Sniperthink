/**
 * Admin Authentication Middleware
 * Password-based login with JWT sessions for super admin access
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminConfig } from '../config';
import { logger } from '../utils/logger';
import type { AdminTokenPayload } from '../models/types';

// Extend Express Request to include admin info
declare global {
    namespace Express {
        interface Request {
            admin?: AdminTokenPayload;
        }
    }
}

/**
 * Validate admin password and generate JWT token
 */
export function loginAdmin(password: string): { success: boolean; token?: string; expiresAt?: Date; error?: string } {
    if (!password || password !== adminConfig.password) {
        logger.warn('Admin login failed: invalid password');
        return { success: false, error: 'Invalid password' };
    }

    // Calculate expiration
    const expiresInMs = parseExpiresIn(adminConfig.jwtExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const payload: AdminTokenPayload = {
        role: 'super_admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const token = jwt.sign(payload, adminConfig.jwtSecret, {
        algorithm: 'HS256',
    });

    logger.info('Admin login successful');

    return {
        success: true,
        token,
        expiresAt,
    };
}

/**
 * Parse expires in string to milliseconds
 */
function parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(h|d|m|s)?$/);
    if (!match) {
        return 24 * 60 * 60 * 1000; // Default 24 hours
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2] || 'h';

    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            return value * 60 * 60 * 1000; // Default hours
    }
}

/**
 * Verify JWT token
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
    try {
        const decoded = jwt.verify(token, adminConfig.jwtSecret, {
            algorithms: ['HS256'],
        }) as AdminTokenPayload;

        if (decoded.role !== 'super_admin') {
            return null;
        }

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.debug('Admin token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            logger.debug('Invalid admin token');
        }
        return null;
    }
}

/**
 * Admin authentication middleware
 * Protects routes requiring super admin access
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const correlationId = req.headers['x-correlation-id'] as string || 'unknown';

    // Skip auth for login endpoint
    if (req.path === '/admin/login' && req.method === 'POST') {
        return next();
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Admin auth failed: no token provided', { correlationId, path: req.path });
        res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication token provided',
            timestamp: new Date().toISOString(),
            correlationId,
        });
        return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyAdminToken(token);

    if (!payload) {
        logger.warn('Admin auth failed: invalid token', { correlationId, path: req.path });
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
            correlationId,
        });
        return;
    }

    // Attach admin info to request
    req.admin = payload;

    logger.debug('Admin authenticated', { correlationId, path: req.path });
    next();
}

/**
 * Admin login handler
 */
export function adminLoginHandler(req: Request, res: Response): void {
    const correlationId = req.headers['x-correlation-id'] as string || 'unknown';
    const { password } = req.body;

    if (!password) {
        res.status(400).json({
            error: 'Bad Request',
            message: 'Password is required',
            timestamp: new Date().toISOString(),
            correlationId,
        });
        return;
    }

    const result = loginAdmin(password);

    if (!result.success) {
        res.status(401).json({
            error: 'Unauthorized',
            message: result.error,
            timestamp: new Date().toISOString(),
            correlationId,
        });
        return;
    }

    res.status(200).json({
        success: true,
        token: result.token,
        expiresAt: result.expiresAt?.toISOString(),
        timestamp: new Date().toISOString(),
        correlationId,
    });
}

/**
 * Check if request is from authenticated admin
 */
export function isAdmin(req: Request): boolean {
    return !!req.admin && req.admin.role === 'super_admin';
}

/**
 * Refresh admin token
 */
export function refreshAdminToken(req: Request, res: Response): void {
    const correlationId = req.headers['x-correlation-id'] as string || 'unknown';

    if (!req.admin) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Not authenticated',
            timestamp: new Date().toISOString(),
            correlationId,
        });
        return;
    }

    // Generate new token
    const expiresInMs = parseExpiresIn(adminConfig.jwtExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const payload: AdminTokenPayload = {
        role: 'super_admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const token = jwt.sign(payload, adminConfig.jwtSecret, {
        algorithm: 'HS256',
    });

    logger.info('Admin token refreshed', { correlationId });

    res.status(200).json({
        success: true,
        token,
        expiresAt: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
        correlationId,
    });
}
