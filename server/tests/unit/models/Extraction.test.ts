import { ExtractionModel } from '../../../src/models/Extraction';
import { CreateExtractionData, UpdateExtractionData } from '../../../src/models/Extraction';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Extraction Model', () => {
  let mockDb: any;
  let extractionModel: ExtractionModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    extractionModel = new ExtractionModel(mockDb);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new extraction with all fields', async () => {
      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        intent: 'Purchase software',
        urgency: 3,
        budget: 2,
        fit: 3,
        engagement: 2,
        demo_datetime: new Date('2024-02-01T10:00:00Z'),
        smart_notification: 'High priority lead',
        extracted_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockExtraction],
        rowCount: 1
      } as any);

      const data: CreateExtractionData = {
        conversation_id: 'conv-123',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        intent: 'Purchase software',
        urgency: 3,
        budget: 2,
        fit: 3,
        engagement: 2,
        demo_datetime: new Date('2024-02-01T10:00:00Z'),
        smart_notification: 'High priority lead'
      };

      const result = await extractionModel.create(data);

      expect(result).toEqual(mockExtraction);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO extractions'),
        expect.arrayContaining([
          expect.any(String), // extraction_id (UUID)
          'conv-123',
          'John Doe',
          'john@example.com',
          'Acme Corp',
          'Purchase software',
          3,
          2,
          3,
          2,
          data.demo_datetime,
          'High priority lead'
        ])
      );
    });

    it('should create extraction with partial data (nulls for missing fields)', async () => {
      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'Jane Smith',
        email: null,
        company: null,
        intent: null,
        urgency: null,
        budget: null,
        fit: null,
        engagement: null,
        demo_datetime: null,
        smart_notification: null,
        extracted_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockExtraction],
        rowCount: 1
      } as any);

      const data: CreateExtractionData = {
        conversation_id: 'conv-123',
        name: 'Jane Smith'
      };

      const result = await extractionModel.create(data);

      expect(result).toEqual(mockExtraction);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO extractions'),
        expect.arrayContaining([
          expect.any(String),
          'conv-123',
          'Jane Smith',
          null, // email
          null, // company
          null, // intent
          null, // urgency
          null, // budget
          null, // fit
          null, // engagement
          null, // demo_datetime
          null  // smart_notification
        ])
      );
    });

    it('should throw error on database failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const data: CreateExtractionData = {
        conversation_id: 'conv-123',
        name: 'Test User'
      };

      await expect(extractionModel.create(data)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('should update extraction with new data', async () => {
      const mockUpdated = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'John Updated',
        email: 'john.updated@example.com',
        urgency: 2,
        extracted_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdated],
        rowCount: 1
      } as any);

      const updates: UpdateExtractionData = {
        name: 'John Updated',
        email: 'john.updated@example.com',
        urgency: 2
      };

      const result = await extractionModel.update('ext-123', updates);

      expect(result).toEqual(mockUpdated);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE extractions'),
        expect.arrayContaining(['John Updated', 'john.updated@example.com', 2, 'ext-123'])
      );
    });

    it('should return null if extraction not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await extractionModel.update('nonexistent', { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return existing extraction if no fields to update', async () => {
      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'John Doe'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockExtraction],
        rowCount: 1
      } as any);

      const result = await extractionModel.update('ext-123', {});

      expect(result).toEqual(mockExtraction);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM extractions WHERE extraction_id = $1',
        ['ext-123']
      );
    });

    it('should throw error on database failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        extractionModel.update('ext-123', { name: 'Test' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('findById', () => {
    it('should find extraction by ID', async () => {
      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'John Doe'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockExtraction],
        rowCount: 1
      } as any);

      const result = await extractionModel.findById('ext-123');

      expect(result).toEqual(mockExtraction);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM extractions WHERE extraction_id = $1',
        ['ext-123']
      );
    });

    it('should return null if extraction not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await extractionModel.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(extractionModel.findById('ext-123')).rejects.toThrow('Query failed');
    });
  });

  describe('findByConversationId', () => {
    it('should find latest extraction for conversation', async () => {
      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'John Doe',
        extracted_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockExtraction],
        rowCount: 1
      } as any);

      const result = await extractionModel.findByConversationId('conv-123');

      expect(result).toEqual(mockExtraction);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE conversation_id = $1'),
        ['conv-123']
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY extracted_at DESC'),
        ['conv-123']
      );
    });

    it('should return null if no extraction found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await extractionModel.findByConversationId('conv-123');

      expect(result).toBeNull();
    });
  });

  describe('findAllByConversationId', () => {
    it('should find all extractions for conversation', async () => {
      const mockExtractions = [
        { extraction_id: 'ext-1', conversation_id: 'conv-123', extracted_at: new Date('2024-02-01') },
        { extraction_id: 'ext-2', conversation_id: 'conv-123', extracted_at: new Date('2024-01-01') }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockExtractions,
        rowCount: 2
      } as any);

      const result = await extractionModel.findAllByConversationId('conv-123');

      expect(result).toEqual(mockExtractions);
      expect(result).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY extracted_at DESC'),
        ['conv-123']
      );
    });

    it('should return empty array if no extractions found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await extractionModel.findAllByConversationId('conv-123');

      expect(result).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('should find extractions for user with pagination', async () => {
      const mockExtractions = [
        { extraction_id: 'ext-1', conversation_id: 'conv-1' },
        { extraction_id: 'ext-2', conversation_id: 'conv-2' }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockExtractions,
        rowCount: 2
      } as any);

      const result = await extractionModel.findByUserId('user-123', 50, 0);

      expect(result).toEqual(mockExtractions);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN conversations c'),
        ['user-123', 50, 0]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN agents a'),
        ['user-123', 50, 0]
      );
    });

    it('should use default pagination values', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await extractionModel.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-123', 50, 0]
      );
    });
  });

  describe('delete', () => {
    it('should delete extraction and return true', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      } as any);

      const result = await extractionModel.delete('ext-123');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM extractions WHERE extraction_id = $1',
        ['ext-123']
      );
    });

    it('should return false if extraction not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await extractionModel.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(extractionModel.delete('ext-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('existsForConversation', () => {
    it('should return true if extraction exists', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ exists: true }],
        rowCount: 1
      } as any);

      const result = await extractionModel.existsForConversation('conv-123');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM extractions WHERE conversation_id = $1 LIMIT 1',
        ['conv-123']
      );
    });

    it('should return false if extraction does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await extractionModel.existsForConversation('conv-123');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(
        extractionModel.existsForConversation('conv-123')
      ).rejects.toThrow('Query failed');
    });
  });
});
