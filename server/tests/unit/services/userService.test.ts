import { UserService } from '../../../src/services/userService';
import { CreateUserData, CreatePhoneNumberData, UpdateUserData } from '../../../src/models/types';

// Mock the models
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/PhoneNumber');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock validation utilities
jest.mock('../../../src/utils/validation', () => ({
  validateCreateUserData: jest.fn(),
  validateCreatePhoneNumberData: jest.fn(),
  validateUserId: jest.fn(),
  validatePhoneNumberId: jest.fn(),
  throwIfInvalid: jest.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public errors: string[]) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}));

describe('UserService', () => {
  let mockDb: any;
  let userService: UserService;
  let mockUserModel: any;
  let mockPhoneNumberModel: any;

  beforeEach(() => {
    mockDb = {};
    userService = new UserService(mockDb);
    
    mockUserModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      exists: jest.fn()
    };
    
    mockPhoneNumberModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByExternalNumber: jest.fn(),
      validateType: jest.fn()
    };
    
    // Access private properties for testing
    (userService as any).userModel = mockUserModel;
    (userService as any).phoneNumberModel = mockPhoneNumberModel;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData: CreateUserData = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company'
      };

      const mockUser = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company',
        created_at: new Date()
      };

      const { validateCreateUserData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreateUserData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(null);
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockUserModel.create).toHaveBeenCalledWith(userData);
    });

    it('should return error when user already exists', async () => {
      const userData: CreateUserData = {
        user_id: 'test-user-1',
        email: 'test@example.com'
      };

      const existingUser = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: null,
        created_at: new Date()
      };

      const { validateCreateUserData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreateUserData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(existingUser);

      const result = await userService.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with ID test-user-1 already exists');
    });

    it('should return error when email already exists', async () => {
      const userData: CreateUserData = {
        user_id: 'test-user-1',
        email: 'test@example.com'
      };

      const existingUser = {
        user_id: 'other-user',
        email: 'test@example.com',
        company_name: null,
        created_at: new Date()
      };

      const { validateCreateUserData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreateUserData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(null);
      mockUserModel.findByEmail.mockResolvedValue(existingUser);

      const result = await userService.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with email test@example.com already exists');
    });

    it('should return validation error', async () => {
      const userData: CreateUserData = {
        user_id: '',
        email: 'invalid-email'
      };

      const { validateCreateUserData, throwIfInvalid, ValidationError } = require('../../../src/utils/validation');
      validateCreateUserData.mockReturnValue({ 
        isValid: false, 
        errors: ['User ID is required', 'Email must be valid'] 
      });
      throwIfInvalid.mockImplementation((validation: any, context: any) => {
        if (!validation.isValid) {
          throw new ValidationError(`Validation failed for ${context}`, validation.errors);
        }
      });

      const result = await userService.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getUserById', () => {
    it('should get user successfully', async () => {
      const mockUser = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company',
        created_at: new Date()
      };

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('test-user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error when user not found', async () => {
      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(null);

      const result = await userService.getUserById('non-existent-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with ID non-existent-user not found');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData: UpdateUserData = {
        email: 'newemail@example.com',
        company_name: 'New Company'
      };

      const existingUser = {
        user_id: 'test-user-1',
        email: 'old@example.com',
        company_name: 'Old Company',
        created_at: new Date()
      };

      const updatedUser = {
        user_id: 'test-user-1',
        email: 'newemail@example.com',
        company_name: 'New Company',
        created_at: new Date()
      };

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('test-user-1', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
    });

    it('should return error when user not found', async () => {
      const updateData: UpdateUserData = {
        email: 'newemail@example.com'
      };

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(null);

      const result = await userService.updateUser('non-existent-user', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with ID non-existent-user not found');
    });

    it('should return error when email is already in use', async () => {
      const updateData: UpdateUserData = {
        email: 'existing@example.com'
      };

      const existingUser = {
        user_id: 'test-user-1',
        email: 'old@example.com',
        company_name: 'Old Company',
        created_at: new Date()
      };

      const emailUser = {
        user_id: 'other-user',
        email: 'existing@example.com',
        company_name: 'Other Company',
        created_at: new Date()
      };

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findByEmail.mockResolvedValue(emailUser);

      const result = await userService.updateUser('test-user-1', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email existing@example.com is already in use');
    });
  });

  describe('deleteUser', () => {
    it('should delete user and associated phone numbers successfully', async () => {
      const existingUser = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company',
        created_at: new Date()
      };

      const phoneNumbers = [
        {
          id: 'phone-1',
          user_id: 'test-user-1',
          platform: 'whatsapp' as const,
          meta_phone_number_id: '+1234567890',
          access_token: 'token-1',
          display_name: 'Phone 1',
          created_at: new Date()
        }
      ];

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockPhoneNumberModel.findByUserId.mockResolvedValue(phoneNumbers);
      mockPhoneNumberModel.delete.mockResolvedValue(true);
      mockUserModel.delete.mockResolvedValue(true);

      const result = await userService.deleteUser('test-user-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockPhoneNumberModel.delete).toHaveBeenCalledWith('phone-1');
      expect(mockUserModel.delete).toHaveBeenCalledWith('test-user-1');
    });

    it('should return error when user not found', async () => {
      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.findById.mockResolvedValue(null);

      const result = await userService.deleteUser('non-existent-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with ID non-existent-user not found');
    });
  });

  describe('addPhoneNumber', () => {
    it('should add phone number successfully', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123',
        display_name: 'Main WhatsApp'
      };

      const mockPhoneNumber = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp' as const,
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123',
        display_name: 'Main WhatsApp',
        created_at: new Date()
      };

      const { validateCreatePhoneNumberData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreatePhoneNumberData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.exists.mockResolvedValue(true);
      mockPhoneNumberModel.findById.mockResolvedValue(null);
      mockPhoneNumberModel.findByExternalNumber.mockResolvedValue(null);
      mockPhoneNumberModel.create.mockResolvedValue(mockPhoneNumber);

      const result = await userService.addPhoneNumber(phoneNumberData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhoneNumber);
    });

    it('should return error when user not found', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'phone-123',
        user_id: 'non-existent-user',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123'
      };

      const { validateCreatePhoneNumberData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreatePhoneNumberData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.exists.mockResolvedValue(false);

      const result = await userService.addPhoneNumber(phoneNumberData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with ID non-existent-user not found');
    });

    it('should return error when phone number ID already exists', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'existing-phone',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123'
      };

      const existingPhoneNumber = {
        id: 'existing-phone',
        user_id: 'other-user',
        platform: 'whatsapp' as const,
        meta_phone_number_id: '+9999999999',
        access_token: 'other-token',
        display_name: null,
        created_at: new Date()
      };

      const { validateCreatePhoneNumberData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreatePhoneNumberData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.exists.mockResolvedValue(true);
      mockPhoneNumberModel.findById.mockResolvedValue(existingPhoneNumber);

      const result = await userService.addPhoneNumber(phoneNumberData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number with ID existing-phone already exists');
    });

    it('should return error when external number already registered', async () => {
      const phoneNumberData: CreatePhoneNumberData = {
        id: 'phone-123',
        user_id: 'user-1',
        platform: 'whatsapp',
        meta_phone_number_id: '+1234567890',
        access_token: 'token-123'
      };

      const existingExternalNumber = {
        id: 'other-phone',
        user_id: 'other-user',
        platform: 'whatsapp' as const,
        meta_phone_number_id: '+1234567890',
        access_token: 'other-token',
        display_name: null,
        created_at: new Date()
      };

      const { validateCreatePhoneNumberData, throwIfInvalid } = require('../../../src/utils/validation');
      validateCreatePhoneNumberData.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.exists.mockResolvedValue(true);
      mockPhoneNumberModel.findById.mockResolvedValue(null);
      mockPhoneNumberModel.findByExternalNumber.mockResolvedValue(existingExternalNumber);

      const result = await userService.addPhoneNumber(phoneNumberData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('External number +1234567890 is already registered for whatsapp');
    });
  });

  describe('getUserPhoneNumbers', () => {
    it('should get user phone numbers successfully', async () => {
      const mockPhoneNumbers = [
        {
          id: 'phone-1',
          user_id: 'user-1',
          platform: 'whatsapp' as const,
          meta_phone_number_id: '+1234567890',
          access_token: 'token-1',
          display_name: 'Phone 1',
          created_at: new Date()
        }
      ];

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.exists.mockResolvedValue(true);
      mockPhoneNumberModel.findByUserId.mockResolvedValue(mockPhoneNumbers);

      const result = await userService.getUserPhoneNumbers('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhoneNumbers);
    });

    it('should return error when user not found', async () => {
      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockUserModel.exists.mockResolvedValue(false);

      const result = await userService.getUserPhoneNumbers('non-existent-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with ID non-existent-user not found');
    });
  });
});