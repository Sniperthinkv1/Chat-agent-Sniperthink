import { Request, Response, NextFunction } from 'express';
import { UsersController } from '../../../src/controllers/users';
import { UserService } from '../../../src/services/userService';
import * as creditService from '../../../src/services/creditService';
import { Platform } from '../../../src/models/types';

// Mock dependencies
jest.mock('../../../src/services/userService');
jest.mock('../../../src/services/creditService');
jest.mock('../../../src/utils/database', () => ({
  db: {
    pool: {},
  },
}));
jest.mock('../../../src/utils/redis', () => ({
  redis: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    healthCheck: jest.fn(),
  },
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('UsersController', () => {
  let controller: UsersController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create controller instance
    controller = new UsersController();

    // Get mocked service instances
    mockUserService = (controller as any).userService;

    // Setup mock request
    mockRequest = {
      params: {},
      body: {},
      query: {},
      correlationId: 'test-correlation-id',
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next
    mockNext = jest.fn();
  });

  describe('addPhoneNumber', () => {
    it('should add phone number successfully', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = {
        id: 'phone123',
        platform: 'whatsapp',
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
        display_name: 'Test Phone',
      };

      const mockPhoneNumber = {
        id: 'phone123',
        user_id: 'user123',
        platform: 'whatsapp' as Platform,
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
        display_name: 'Test Phone',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserService.addPhoneNumber.mockResolvedValue({
        success: true,
        data: mockPhoneNumber,
      });

      await controller.addPhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.addPhoneNumber).toHaveBeenCalledWith({
        id: 'phone123',
        user_id: 'user123',
        platform: 'whatsapp',
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
        display_name: 'Test Phone',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPhoneNumber,
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = {
        id: 'phone123',
        // Missing platform, meta_phone_number_id, access_token
      };

      await controller.addPhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      );
      expect(mockUserService.addPhoneNumber).not.toHaveBeenCalled();
    });

    it('should return 400 when platform is invalid', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = {
        id: 'phone123',
        platform: 'invalid-platform',
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
      };

      await controller.addPhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid platform',
        })
      );
      expect(mockUserService.addPhoneNumber).not.toHaveBeenCalled();
    });

    it('should return 400 when service fails', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = {
        id: 'phone123',
        platform: 'whatsapp',
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
      };

      mockUserService.addPhoneNumber.mockResolvedValue({
        success: false,
        error: 'Phone number already exists',
      });

      await controller.addPhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to add phone number',
          message: 'Phone number already exists',
        })
      );
    });

    it('should call next with error when exception occurs', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = {
        id: 'phone123',
        platform: 'whatsapp',
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
      };

      const error = new Error('Database error');
      mockUserService.addPhoneNumber.mockRejectedValue(error);

      await controller.addPhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listPhoneNumbers', () => {
    it('should list all phone numbers for a user', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.query = {};

      const mockPhoneNumbers = [
        {
          id: 'phone123',
          user_id: 'user123',
          platform: 'whatsapp' as Platform,
          meta_phone_number_id: 'meta123',
          access_token: 'token123',
          display_name: 'Test Phone 1',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'phone456',
          user_id: 'user123',
          platform: 'instagram' as Platform,
          meta_phone_number_id: 'meta456',
          access_token: 'token456',
          display_name: 'Test Phone 2',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockUserService.getUserPhoneNumbers.mockResolvedValue({
        success: true,
        data: mockPhoneNumbers,
      });

      await controller.listPhoneNumbers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserPhoneNumbers).toHaveBeenCalledWith('user123', {});
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPhoneNumbers,
          count: 2,
        })
      );
    });

    it('should filter phone numbers by platform', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.query = { platform: 'whatsapp' };

      const mockPhoneNumbers = [
        {
          id: 'phone123',
          user_id: 'user123',
          platform: 'whatsapp' as Platform,
          meta_phone_number_id: 'meta123',
          access_token: 'token123',
          display_name: 'Test Phone',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockUserService.getUserPhoneNumbersByType.mockResolvedValue({
        success: true,
        data: mockPhoneNumbers,
      });

      await controller.listPhoneNumbers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserPhoneNumbersByType).toHaveBeenCalledWith(
        'user123',
        'whatsapp'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when platform filter is invalid', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.query = { platform: 'invalid-platform' };

      await controller.listPhoneNumbers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid platform',
        })
      );
    });

    it('should handle pagination parameters', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.query = {
        limit: '10',
        offset: '20',
        orderBy: 'created_at',
        orderDirection: 'DESC',
      };

      mockUserService.getUserPhoneNumbers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.listPhoneNumbers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserPhoneNumbers).toHaveBeenCalledWith('user123', {
        limit: 10,
        offset: 20,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });
    });

    it('should return 404 when service fails', async () => {
      mockRequest.params = { user_id: 'user123' };

      mockUserService.getUserPhoneNumbers.mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      await controller.listPhoneNumbers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deletePhoneNumber', () => {
    it('should delete phone number successfully', async () => {
      mockRequest.params = { user_id: 'user123', phone_number_id: 'phone123' };

      const mockPhoneNumber = {
        id: 'phone123',
        user_id: 'user123',
        platform: 'whatsapp' as Platform,
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
        display_name: 'Test Phone',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserService.getPhoneNumberById.mockResolvedValue({
        success: true,
        data: mockPhoneNumber,
      });

      mockUserService.deletePhoneNumber.mockResolvedValue({
        success: true,
        data: true,
      });

      await controller.deletePhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getPhoneNumberById).toHaveBeenCalledWith('phone123');
      expect(mockUserService.deletePhoneNumber).toHaveBeenCalledWith('phone123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Phone number deleted successfully',
        })
      );
    });

    it('should return 404 when phone number not found', async () => {
      mockRequest.params = { user_id: 'user123', phone_number_id: 'phone123' };

      mockUserService.getPhoneNumberById.mockResolvedValue({
        success: false,
        error: 'Phone number not found',
      });

      await controller.deletePhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockUserService.deletePhoneNumber).not.toHaveBeenCalled();
    });

    it('should return 403 when phone number belongs to different user', async () => {
      mockRequest.params = { user_id: 'user123', phone_number_id: 'phone123' };

      const mockPhoneNumber = {
        id: 'phone123',
        user_id: 'different-user',
        platform: 'whatsapp' as Platform,
        meta_phone_number_id: 'meta123',
        access_token: 'token123',
        display_name: 'Test Phone',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserService.getPhoneNumberById.mockResolvedValue({
        success: true,
        data: mockPhoneNumber,
      });

      await controller.deletePhoneNumber(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
        })
      );
      expect(mockUserService.deletePhoneNumber).not.toHaveBeenCalled();
    });
  });

  describe('addCredits', () => {
    it('should add credits successfully', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = { amount: 50 };

      (creditService.addCredits as jest.Mock).mockResolvedValue(150);
      (creditService.logCreditUsage as jest.Mock).mockResolvedValue(undefined);

      await controller.addCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(creditService.addCredits).toHaveBeenCalledWith('user123', 50);
      expect(creditService.logCreditUsage).toHaveBeenCalledWith(
        'user123',
        50,
        'add',
        expect.objectContaining({ correlationId: 'test-correlation-id' })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user_id: 'user123',
            remaining_credits: 150,
            amount_added: 50,
          }),
        })
      );
    });

    it('should add large amount of credits', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = { amount: 10000 };

      (creditService.addCredits as jest.Mock).mockResolvedValue(10100);
      (creditService.logCreditUsage as jest.Mock).mockResolvedValue(undefined);

      await controller.addCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(creditService.addCredits).toHaveBeenCalledWith('user123', 10000);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            remaining_credits: 10100,
            amount_added: 10000,
          }),
        })
      );
    });

    it('should handle credit addition for user with zero balance', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = { amount: 100 };

      (creditService.addCredits as jest.Mock).mockResolvedValue(100);
      (creditService.logCreditUsage as jest.Mock).mockResolvedValue(undefined);

      await controller.addCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(creditService.addCredits).toHaveBeenCalledWith('user123', 100);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should call next with error when service fails', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = { amount: 50 };

      const error = new Error('Database error');
      (creditService.addCredits as jest.Mock).mockRejectedValue(error);

      await controller.addCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should include correlation ID in response', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.body = { amount: 50 };
      mockRequest.correlationId = 'custom-correlation-id';

      (creditService.addCredits as jest.Mock).mockResolvedValue(150);
      (creditService.logCreditUsage as jest.Mock).mockResolvedValue(undefined);

      await controller.addCredits(
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
  });

  describe('getCredits', () => {
    it('should get user credits successfully', async () => {
      mockRequest.params = { user_id: 'user123' };

      const mockCredits = {
        user_id: 'user123',
        remaining_credits: 100,
        last_updated: new Date(),
      };

      (creditService.getCreditStats as jest.Mock).mockResolvedValue(mockCredits);

      await controller.getCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(creditService.getCreditStats).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user_id: 'user123',
            remaining_credits: 100,
          }),
        })
      );
    });

    it('should return 404 when credits not found', async () => {
      mockRequest.params = { user_id: 'user123' };

      (creditService.getCreditStats as jest.Mock).mockResolvedValue(null);

      await controller.getCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to retrieve credits',
        })
      );
    });

    it('should handle zero credit balance', async () => {
      mockRequest.params = { user_id: 'user123' };

      const mockCredits = {
        user_id: 'user123',
        remaining_credits: 0,
        last_updated: new Date(),
      };

      (creditService.getCreditStats as jest.Mock).mockResolvedValue(mockCredits);

      await controller.getCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remaining_credits: 0,
          }),
        })
      );
    });

    it('should call next with error when service fails', async () => {
      mockRequest.params = { user_id: 'user123' };

      const error = new Error('Database connection failed');
      (creditService.getCreditStats as jest.Mock).mockRejectedValue(error);

      await controller.getCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should include correlation ID in response', async () => {
      mockRequest.params = { user_id: 'user123' };
      mockRequest.correlationId = 'test-correlation-123';

      const mockCredits = {
        user_id: 'user123',
        remaining_credits: 500,
        last_updated: new Date(),
      };

      (creditService.getCreditStats as jest.Mock).mockResolvedValue(mockCredits);

      await controller.getCredits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-123',
        })
      );
    });
  });
});
