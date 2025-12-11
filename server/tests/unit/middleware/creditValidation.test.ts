import { Request, Response, NextFunction } from 'express';
import { validateCreditAmount } from '../../../src/middleware/auth';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Credit Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      get: jest.fn((header: string) => {
        if (header === 'x-correlation-id') return 'test-correlation-id';
        return undefined;
      }) as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('validateCreditAmount', () => {
    it('should pass validation for valid positive integer amount', () => {
      mockRequest.body = { amount: 100 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass validation for amount of 1', () => {
      mockRequest.body = { amount: 1 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation for large valid amount', () => {
      mockRequest.body = { amount: 1000000 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is missing', () => {
      mockRequest.body = {};

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing amount',
          message: 'Amount is required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is null', () => {
      mockRequest.body = { amount: null };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing amount',
          message: 'Amount is required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is undefined', () => {
      mockRequest.body = { amount: undefined };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is not a number (string)', () => {
      mockRequest.body = { amount: '100' };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount must be a number',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is not a number (boolean)', () => {
      mockRequest.body = { amount: true };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount must be a number',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is not a number (object)', () => {
      mockRequest.body = { amount: { value: 100 } };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is NaN', () => {
      mockRequest.body = { amount: NaN };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount must be a number',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is zero', () => {
      mockRequest.body = { amount: 0 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount must be a positive number',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is negative', () => {
      mockRequest.body = { amount: -50 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount must be a positive number',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is a decimal', () => {
      mockRequest.body = { amount: 10.5 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount must be an integer',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is a float', () => {
      mockRequest.body = { amount: 99.99 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount exceeds MAX_SAFE_INTEGER', () => {
      mockRequest.body = { amount: Number.MAX_SAFE_INTEGER + 1 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid amount',
          message: 'Amount exceeds maximum allowed value',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is Infinity', () => {
      mockRequest.body = { amount: Infinity };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should include correlation ID in error response', () => {
      mockRequest.body = { amount: -10 };
      mockRequest.get = jest.fn((header: string) => {
        if (header === 'x-correlation-id') return 'custom-correlation-id';
        return undefined;
      }) as any;

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'custom-correlation-id',
        })
      );
    });

    it('should include timestamp in error response', () => {
      mockRequest.body = { amount: 0 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle missing correlation ID gracefully', () => {
      mockRequest.body = { amount: -5 };
      mockRequest.get = jest.fn(() => undefined) as any;

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'unknown',
        })
      );
    });

    it('should handle error gracefully when correlation ID retrieval fails', () => {
      // Test that middleware handles errors in try-catch block
      mockRequest.body = { amount: 100 };
      
      // Mock get to throw error only after first call (for correlationId in catch block)
      let callCount = 0;
      mockRequest.get = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Unexpected error');
        }
        return 'fallback-correlation-id';
      }) as any;

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should catch error and return 500
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate amount at boundary (MAX_SAFE_INTEGER)', () => {
      mockRequest.body = { amount: Number.MAX_SAFE_INTEGER };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle very small negative numbers', () => {
      mockRequest.body = { amount: -0.0001 };

      validateCreditAmount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
