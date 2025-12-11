import { Request, Response, NextFunction } from 'express';
import { addCorrelationId, logRequest, logWebhookPayload, sanitizeLogData, logError } from '../../../src/middleware/logging';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

describe('Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      get: jest.fn(),
      headers: {},
      method: 'GET',
      url: '/test',
      body: {}
    };

    mockResponse = {
      set: jest.fn(),
      on: jest.fn(),
      statusCode: 200
    };

    mockNext = jest.fn();
  });

  describe('addCorrelationId', () => {
    it('should use existing correlation ID from headers', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('existing-correlation-id');

      addCorrelationId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.headers!['x-correlation-id']).toBe('existing-correlation-id');
      expect(mockResponse.set).toHaveBeenCalledWith('x-correlation-id', 'existing-correlation-id');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate new correlation ID if not provided', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      addCorrelationId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.headers!['x-correlation-id']).toBe('test-uuid-1234');
      expect(mockResponse.set).toHaveBeenCalledWith('x-correlation-id', 'test-uuid-1234');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logRequest', () => {
    it('should log incoming request', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'x-correlation-id': 'test-correlation-id',
          'User-Agent': 'test-agent',
          'Content-Type': 'application/json',
          'Content-Length': '100'
        };
        return headers[header];
      });

      logRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        method: 'GET',
        url: '/test',
        userAgent: 'test-agent',
        contentType: 'application/json',
        contentLength: '100',
        correlationId: 'test-correlation-id'
      }));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log request completion on finish event', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('test-correlation-id');
      let finishCallback: () => void = () => {};
      
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      logRequest(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Trigger finish event
      finishCallback();

      expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
        method: 'GET',
        url: '/test',
        statusCode: 200,
        correlationId: 'test-correlation-id'
      }));
    });

    it('should log warning for error status codes', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('test-correlation-id');
      mockResponse.statusCode = 500;
      let finishCallback: () => void = () => {};
      
      (mockResponse.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      logRequest(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Trigger finish event
      finishCallback();

      expect(logger.warn).toHaveBeenCalledWith('Request completed', expect.objectContaining({
        statusCode: 500
      }));
    });
  });

  describe('logWebhookPayload', () => {
    it('should log full payload in development environment', () => {
      process.env['NODE_ENV'] = 'development';
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'x-correlation-id': 'test-correlation-id',
          'X-Hub-Signature-256': 'sha256=test',
          'Content-Type': 'application/json',
          'User-Agent': 'Meta-Webhook'
        };
        return headers[header];
      });
      mockRequest.body = { test: 'data' };

      logWebhookPayload(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.debug).toHaveBeenCalledWith('Webhook payload received', expect.objectContaining({
        body: { test: 'data' },
        correlationId: 'test-correlation-id'
      }));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log only metadata in production environment', () => {
      process.env['NODE_ENV'] = 'production';
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'x-correlation-id': 'test-correlation-id',
          'X-Hub-Signature-256': 'sha256=test',
          'Content-Type': 'application/json',
          'Content-Length': '100'
        };
        return headers[header];
      });

      logWebhookPayload(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Webhook payload received', expect.objectContaining({
        contentType: 'application/json',
        contentLength: '100',
        hasSignature: true,
        correlationId: 'test-correlation-id'
      }));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeLogData', () => {
    it('should redact sensitive fields', () => {
      const data = {
        access_token: 'secret-token',
        api_key: 'secret-key',
        password: 'secret-password',
        username: 'john'
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.access_token).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.username).toBe('john');
    });

    it('should recursively sanitize nested objects', () => {
      const data = {
        user: {
          name: 'john',
          credentials: {
            password: 'secret',
            api_key: 'key123'
          }
        }
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.user.name).toBe('john');
      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.credentials.api_key).toBe('[REDACTED]');
    });

    it('should handle non-object data', () => {
      expect(sanitizeLogData('string')).toBe('string');
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(null)).toBe(null);
      expect(sanitizeLogData(undefined)).toBe(undefined);
    });
  });

  describe('logError', () => {
    it('should log error with correlation ID', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      (mockRequest.get as jest.Mock).mockReturnValue('test-correlation-id');

      logError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Request error', expect.objectContaining({
        error: 'Test error',
        stack: 'Error stack trace',
        method: 'GET',
        url: '/test',
        correlationId: 'test-correlation-id'
      }));
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should use unknown correlation ID if not provided', () => {
      const error = new Error('Test error');
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      logError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Request error', expect.objectContaining({
        correlationId: 'unknown'
      }));
    });
  });
});
