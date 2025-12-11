import { Request, Response, NextFunction } from 'express';
import { ExtractionsController } from '../../../src/controllers/extractions';
import extractionService from '../../../src/services/extractionService';
import { db } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

jest.mock('../../../src/services/extractionService');
jest.mock('../../../src/utils/database');
jest.mock('../../../src/utils/logger');

describe('ExtractionsController', () => {
  let controller: ExtractionsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    controller = new ExtractionsController();
    mockRequest = { params: {}, query: {}, correlationId: 'test-id' } as any;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as any;
    mockNext = jest.fn();
    mockQuery = jest.fn();
    (db as any).pool = { query: mockQuery };
    jest.clearAllMocks();
  });

  describe('getExtractions', () => {
    it('should retrieve extractions with pagination', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { limit: '10', offset: '0' };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ extraction_id: 'ext-1' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      await controller.getExtractions(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getExtraction', () => {
    it('should retrieve a specific extraction', async () => {
      mockRequest.params = { user_id: 'user-123', extraction_id: 'ext-123' };
      mockQuery.mockResolvedValueOnce({ rows: [{ extraction_id: 'ext-123', user_id: 'user-123' }] });

      await controller.getExtraction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('triggerExtraction', () => {
    it('should trigger extraction', async () => {
      mockRequest.params = { user_id: 'user-123', conversation_id: 'conv-123' };
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'user-123', is_active: true }] });
      (extractionService.shouldExtract as jest.Mock).mockResolvedValueOnce(true);

      await controller.triggerExtraction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(202);
    });
  });

  describe('exportExtractions', () => {
    it('should export as JSON', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.exportExtractions(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getExtractionStats', () => {
    it('should retrieve stats', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockQuery.mockResolvedValueOnce({ rows: [{ total_extractions: '10', with_email: '8', with_demo: '5', high_urgency: '6', good_fit: '7', high_engagement: '5', avg_urgency: '2.5', avg_budget: '2.0', avg_fit: '2.3', avg_engagement: '2.1' }] });

      await controller.getExtractionStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
