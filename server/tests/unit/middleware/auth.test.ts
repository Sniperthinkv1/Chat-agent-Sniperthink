import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Mock dependencies before importing
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('../../../src/config', () => ({
    webhookConfig: {
        secret: 'test-webhook-secret'
    }
}));

// Import after mocking
import { validateWebhookSignature, handleWebhookVerification, validateApiKey } from '../../../src/middleware/auth';
import { logger } from '../../../src/utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockSend: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn().mockReturnThis();
        mockStatus = jest.fn().mockReturnThis();
        mockSend = jest.fn().mockReturnThis();
        mockNext = jest.fn();

        mockResponse = {
            json: mockJson,
            status: mockStatus,
            send: mockSend
        };

        mockRequest = {
            get: jest.fn(),
            body: '',
            query: {}
        };

        jest.clearAllMocks();
    });

    describe('validateWebhookSignature', () => {
        const testPayload = 'test-payload';
        const testSecret = 'test-webhook-secret';
        
        function generateValidSignature(payload: string, secret: string): string {
            return 'sha256=' + crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
        }

        beforeEach(() => {
            mockRequest.body = testPayload;
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                if (header === 'X-Hub-Signature-256') return generateValidSignature(testPayload, testSecret);
                return undefined;
            });
        });

        it('should validate correct signature and call next', () => {
            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Webhook signature validated successfully',
                { correlationId: 'test-correlation-id' }
            );
        });

        it('should reject request with missing signature', () => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                return undefined; // No signature header
            });

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Missing signature',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should reject request with missing payload', () => {
            mockRequest.body = null;

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Missing payload',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should reject request with invalid signature', () => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                if (header === 'X-Hub-Signature-256') return 'sha256=invalid-signature';
                return undefined;
            });

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid signature',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should handle signature without sha256= prefix', () => {
            const signature = crypto.createHmac('sha256', testSecret).update(testPayload, 'utf8').digest('hex');
            
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                if (header === 'X-Hub-Signature-256') return signature; // No prefix
                return undefined;
            });

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle errors gracefully', () => {
            // Mock crypto.createHmac to throw an error
            const originalCreateHmac = crypto.createHmac;
            crypto.createHmac = jest.fn().mockImplementation(() => {
                throw new Error('Crypto error');
            });

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Internal server error',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });

            // Restore original function
            crypto.createHmac = originalCreateHmac;
        });

        it('should handle missing correlation ID', () => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'X-Hub-Signature-256') return generateValidSignature(testPayload, testSecret);
                return undefined; // No correlation ID
            });

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Webhook signature validated successfully',
                { correlationId: 'unknown' }
            );
        });

        it('should use timing-safe comparison for security', () => {
            const timingSafeEqualSpy = jest.spyOn(crypto, 'timingSafeEqual');

            validateWebhookSignature(mockRequest as Request, mockResponse as Response, mockNext);

            expect(timingSafeEqualSpy).toHaveBeenCalled();
            
            timingSafeEqualSpy.mockRestore();
        });
    });

    describe('handleWebhookVerification', () => {
        beforeEach(() => {
            (mockRequest.get as jest.Mock).mockReturnValue('test-correlation-id');
        });

        it('should verify webhook with correct parameters', () => {
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'test-webhook-secret',
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

        it('should reject verification with wrong token', () => {
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'wrong-token',
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

        it('should reject verification with wrong mode', () => {
            mockRequest.query = {
                'hub.mode': 'unsubscribe',
                'hub.verify_token': 'test-webhook-secret',
                'hub.challenge': 'challenge-123'
            };

            handleWebhookVerification(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Webhook verification failed',
                expect.objectContaining({
                    mode: 'unsubscribe',
                    tokenMatch: true
                })
            );
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

        it('should log verification request details', () => {
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'test-webhook-secret',
                'hub.challenge': 'challenge-123'
            };

            handleWebhookVerification(mockRequest as Request, mockResponse as Response);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Webhook verification request received',
                {
                    mode: 'subscribe',
                    token: 'provided',
                    challenge: 'provided',
                    correlationId: 'test-correlation-id'
                }
            );
        });
    });

    describe('validateApiKey', () => {
        beforeEach(() => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                if (header === 'x-api-key') return 'valid-api-key-123';
                return undefined;
            });
        });

        it('should validate API key and call next', () => {
            validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'API key validated successfully',
                { correlationId: 'test-correlation-id' }
            );
        });

        it('should reject request with missing API key', () => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                return undefined; // No API key
            });

            validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Missing API key',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should reject request with invalid API key format', () => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-correlation-id') return 'test-correlation-id';
                if (header === 'x-api-key') return 'short'; // Too short
                return undefined;
            });

            validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid API key',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should handle errors gracefully', () => {
            // Mock get method to throw an error on first call (x-api-key), but return correlation ID on second call
            let callCount = 0;
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                callCount++;
                if (header === 'x-api-key' && callCount === 1) {
                    throw new Error('Request error');
                }
                if (header === 'x-correlation-id') return 'test-correlation-id';
                return undefined;
            });

            validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Internal server error',
                correlationId: 'test-correlation-id',
                timestamp: expect.any(String)
            });
        });

        it('should handle missing correlation ID', () => {
            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === 'x-api-key') return 'valid-api-key-123';
                return undefined; // No correlation ID
            });

            validateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});