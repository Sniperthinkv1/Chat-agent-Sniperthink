import { PhoneNumberModel } from '../../../src/models/PhoneNumber';
import { CreatePhoneNumberData, UpdatePhoneNumberData } from '../../../src/models/types';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('PhoneNumberModel', () => {
  let mockDb: any;
  let phoneNumberModel: PhoneNumberModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    phoneNumberModel = new PhoneNumberModel(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a phone number successfully', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123',
        display_name: 'Main WhatsApp'
      };

      const mockResult = {
        rows: [{
          id: 'phone-123',
          user_id: 'user-1',
          platform: 'whatsapp',
          meta_phone_number_id: '+1234567890',
          access_token: 'token-123',
          display_name: 'Main WhatsApp',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await phoneNumberModel.create(phoneNumberData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO phone_numbers'),
        ['phone-123', 'user-1', 'whatsapp', '+1234567890', 'token-123', 'Main WhatsApp']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should create a phone number without display name', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'phone-124',
        user_id: 'user-1',
        platform: 'instagram',
        meta_phone_number_id: '@myinstagram',
        access_token: 'token-124'
      };

      const mockResult = {
        rows: [{
          id: 'phone-124',
          user_id: 'user-1',
          platform: 'instagram',
          meta_phone_number_id: '@myinstagram',
          access_token: 'token-124',
          display_name: null,
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await phoneNumberModel.create(phoneNumberData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO phone_numbers'),
        ['phone-124', 'user-1', 'instagram', '@myinstagram', 'token-124', null]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw error when database query fails', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123'
      };

      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(phoneNumberModel.create(phoneNumberData)).rejects.toThrow('Failed to create phone number: Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find phone number by ID successfully', async () => {
      const mockPhoneNumber = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123',
        display_name: 'Main WhatsApp',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockPhoneNumber] });

      const result = await phoneNumberModel.findById('phone-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM phone_numbers WHERE id = $1',
        ['phone-123']
      );
      expect(result).toEqual(mockPhoneNumber);
    });

    it('should return null when phone number not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await phoneNumberModel.findById('non-existent-phone');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find phone numbers by user ID with default options', async () => {
      const mockPhoneNumbers = [
        {
          id: 'phone-123',
          user_id: 'user-1',
          platform: 'whatsapp',
          meta_phone_number_id: '+1234567890',
          access_token: 'token-123',
          display_name: 'Main WhatsApp',
          created_at: new Date()
        },
        {
          id: 'phone-124',
          user_id: 'user-1',
          platform: 'instagram',
          meta_phone_number_id: '@myinstagram',
          access_token: 'token-124',
          display_name: 'Instagram Account',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockPhoneNumbers });

      const result = await phoneNumberModel.findByUserId('user-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM phone_numbers.*WHERE user_id = \$1.*ORDER BY created_at DESC.*LIMIT \$2 OFFSET \$3/s),
        ['user-1', 100, 0]
      );
      expect(result).toEqual(mockPhoneNumbers);
    });

    it('should find phone numbers by user ID with custom options', async () => {
      const mockPhoneNumbers = [
        {
          id: 'phone-123',
          user_id: 'user-1',
          platform: 'whatsapp',
          meta_phone_number_id: '+1234567890',
          access_token: 'token-123',
          display_name: 'Main WhatsApp',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockPhoneNumbers });

      const result = await phoneNumberModel.findByUserId('user-1', {
        limit: 10,
        offset: 5,
        orderBy: 'platform',
        orderDirection: 'ASC'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM phone_numbers.*WHERE user_id = \$1.*ORDER BY platform ASC.*LIMIT \$2 OFFSET \$3/s),
        ['user-1', 10, 5]
      );
      expect(result).toEqual(mockPhoneNumbers);
    });
  });

  describe('findByUserIdAndPlatform', () => {
    it('should find phone numbers by user ID and platform', async () => {
      const mockPhoneNumbers = [
        {
          id: 'phone-123',
          user_id: 'user-1',
          platform: 'whatsapp',
          meta_phone_number_id: '+1234567890',
          access_token: 'token-123',
          display_name: 'Main WhatsApp',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockPhoneNumbers });

      const result = await phoneNumberModel.findByUserIdAndPlatform('user-1', 'whatsapp');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM phone_numbers WHERE user_id = $1 AND platform = $2 ORDER BY created_at DESC',
        ['user-1', 'whatsapp']
      );
      expect(result).toEqual(mockPhoneNumbers);
    });
  });

  describe('update', () => {
    it('should update phone number successfully', async () => {
      const updateData: UpdatePhoneNumberData = {
        display_name: 'Updated WhatsApp',
        access_token: 'new-token-123'
      };

      const mockResult = {
        rows: [{
          id: 'phone-123',
          user_id: 'user-1',
          platform: 'whatsapp',
          meta_phone_number_id: '+1234567890',
          access_token: 'new-token-123',
          display_name: 'Updated WhatsApp',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await phoneNumberModel.update('phone-123', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE phone_numbers.*SET access_token = \$1, display_name = \$2.*WHERE id = \$3/s),
        ['new-token-123', 'Updated WhatsApp', 'phone-123']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when phone number not found', async () => {
      const updateData: UpdatePhoneNumberData = {
        display_name: 'Updated WhatsApp'
      };

      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await phoneNumberModel.update('non-existent-phone', updateData);

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      const updateData: UpdatePhoneNumberData = {};

      await expect(phoneNumberModel.update('phone-123', updateData)).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should delete phone number successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await phoneNumberModel.delete('phone-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM phone_numbers WHERE id = $1',
        ['phone-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when phone number not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      const result = await phoneNumberModel.delete('non-existent-phone');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when phone number exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await phoneNumberModel.exists('phone-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM phone_numbers WHERE id = $1',
        ['phone-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when phone number does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await phoneNumberModel.exists('non-existent-phone');

      expect(result).toBe(false);
    });
  });

  describe('findByMetaPhoneNumberId', () => {
    it('should find phone number by meta_phone_number_id and platform', async () => {
      const mockPhoneNumber = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123',
        display_name: 'Main WhatsApp',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockPhoneNumber] });

      const result = await phoneNumberModel.findByMetaPhoneNumberId('+1234567890', 'whatsapp');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM phone_numbers WHERE meta_phone_number_id = $1 AND platform = $2',
        ['+1234567890', 'whatsapp']
      );
      expect(result).toEqual(mockPhoneNumber);
    });

    it('should return null when phone number not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await phoneNumberModel.findByMetaPhoneNumberId('+9999999999', 'whatsapp');

      expect(result).toBeNull();
    });
  });

  describe('validatePlatform', () => {
    it('should return true for valid platforms', () => {
      expect(phoneNumberModel.validatePlatform('whatsapp')).toBe(true);
      expect(phoneNumberModel.validatePlatform('instagram')).toBe(true);
      expect(phoneNumberModel.validatePlatform('webchat')).toBe(true);
    });

    it('should return false for invalid platforms', () => {
      expect(phoneNumberModel.validatePlatform('invalid')).toBe(false);
      expect(phoneNumberModel.validatePlatform('telegram')).toBe(false);
      expect(phoneNumberModel.validatePlatform('')).toBe(false);
    });
  });
});
