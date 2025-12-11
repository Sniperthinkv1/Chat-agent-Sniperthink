import { Pool } from 'pg';
import { UserModel } from '../models/User';
import { PhoneNumberModel } from '../models/PhoneNumber';
import { 
  User, 
  PhoneNumber, 
  CreateUserData, 
  UpdateUserData, 
  CreatePhoneNumberData, 
  UpdatePhoneNumberData,
  Platform,
  QueryOptions,
  ServiceResponse 
} from '../models/types';
import { 
  validateCreateUserData, 
  validateCreatePhoneNumberData, 
  validateUserId,
  validatePhoneNumberId,
  throwIfInvalid,
  ValidationError
} from '../utils/validation';
import { logger } from '../utils/logger';

export class UserService {
  private userModel: UserModel;
  private phoneNumberModel: PhoneNumberModel;

  constructor(db: Pool) {
    this.userModel = new UserModel(db);
    this.phoneNumberModel = new PhoneNumberModel(db);
  }

  async createUser(userData: CreateUserData): Promise<ServiceResponse<User>> {
    try {
      // Validate input data
      const validation = validateCreateUserData(userData);
      throwIfInvalid(validation, 'user creation');

      // Check if user already exists
      const existingUser = await this.userModel.findById(userData.user_id);
      if (existingUser) {
        return {
          success: false,
          error: `User with ID ${userData.user_id} already exists`
        };
      }

      // Check if email is already in use
      const existingEmailUser = await this.userModel.findByEmail(userData.email);
      if (existingEmailUser) {
        return {
          success: false,
          error: `User with email ${userData.email} already exists`
        };
      }

      const user = await this.userModel.create(userData);
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to create user', { error, user_id: userData.user_id });
      return {
        success: false,
        error: 'Failed to create user'
      };
    }
  }

  async getUserById(userId: string): Promise<ServiceResponse<User>> {
    try {
      const validation = validateUserId(userId);
      throwIfInvalid(validation, 'user ID');

      const user = await this.userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: `User with ID ${userId} not found`
        };
      }

      return {
        success: true,
        data: user
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get user', { error, user_id: userId });
      return {
        success: false,
        error: 'Failed to get user'
      };
    }
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<ServiceResponse<User>> {
    try {
      const validation = validateUserId(userId);
      throwIfInvalid(validation, 'user ID');

      // Check if user exists
      const existingUser = await this.userModel.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: `User with ID ${userId} not found`
        };
      }

      // Check if email is already in use by another user
      if (updateData.email && updateData.email !== existingUser.email) {
        const existingEmailUser = await this.userModel.findByEmail(updateData.email);
        if (existingEmailUser && existingEmailUser.user_id !== userId) {
          return {
            success: false,
            error: `Email ${updateData.email} is already in use`
          };
        }
      }

      const updatedUser = await this.userModel.update(userId, updateData);
      
      return {
        success: true,
        data: updatedUser!
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to update user', { error, user_id: userId });
      return {
        success: false,
        error: 'Failed to update user'
      };
    }
  }

  async deleteUser(userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const validation = validateUserId(userId);
      throwIfInvalid(validation, 'user ID');

      // Check if user exists
      const existingUser = await this.userModel.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: `User with ID ${userId} not found`
        };
      }

      // Delete associated phone numbers first
      const phoneNumbers = await this.phoneNumberModel.findByUserId(userId);
      for (const phoneNumber of phoneNumbers) {
        await this.phoneNumberModel.delete(phoneNumber.id);
      }

      const deleted = await this.userModel.delete(userId);
      
      return {
        success: true,
        data: deleted
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to delete user', { error, user_id: userId });
      return {
        success: false,
        error: 'Failed to delete user'
      };
    }
  }

  async addPhoneNumber(phoneNumberData: CreatePhoneNumberData): Promise<ServiceResponse<PhoneNumber>> {
    try {
      // Validate input data
      const validation = validateCreatePhoneNumberData(phoneNumberData);
      throwIfInvalid(validation, 'phone number creation');

      // Check if user exists
      const userExists = await this.userModel.exists(phoneNumberData.user_id);
      if (!userExists) {
        return {
          success: false,
          error: `User with ID ${phoneNumberData.user_id} not found`
        };
      }

      // Check if phone number ID already exists
      const existingPhoneNumber = await this.phoneNumberModel.findById(phoneNumberData.id);
      if (existingPhoneNumber) {
        return {
          success: false,
          error: `Phone number with ID ${phoneNumberData.id} already exists`
        };
      }

      // Check if meta_phone_number_id is already registered for this platform
      const existingMetaPhoneNumber = await this.phoneNumberModel.findByMetaPhoneNumberId(
        phoneNumberData.meta_phone_number_id, 
        phoneNumberData.platform
      );
      if (existingMetaPhoneNumber) {
        return {
          success: false,
          error: `Meta phone number ${phoneNumberData.meta_phone_number_id} is already registered for ${phoneNumberData.platform}`
        };
      }

      const phoneNumber = await this.phoneNumberModel.create(phoneNumberData);
      
      return {
        success: true,
        data: phoneNumber
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to add phone number', { 
        error, 
        id: phoneNumberData.id,
        user_id: phoneNumberData.user_id
      });
      return {
        success: false,
        error: 'Failed to add phone number'
      };
    }
  }

  async getUserPhoneNumbers(userId: string, options: QueryOptions = {}): Promise<ServiceResponse<PhoneNumber[]>> {
    try {
      const validation = validateUserId(userId);
      throwIfInvalid(validation, 'user ID');

      // Check if user exists
      const userExists = await this.userModel.exists(userId);
      if (!userExists) {
        return {
          success: false,
          error: `User with ID ${userId} not found`
        };
      }

      const phoneNumbers = await this.phoneNumberModel.findByUserId(userId, options);
      
      return {
        success: true,
        data: phoneNumbers
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get user phone numbers', { error, user_id: userId });
      return {
        success: false,
        error: 'Failed to get phone numbers'
      };
    }
  }

  async getUserPhoneNumbersByType(userId: string, type: Platform): Promise<ServiceResponse<PhoneNumber[]>> {
    try {
      const userIdValidation = validateUserId(userId);
      throwIfInvalid(userIdValidation, 'user ID');

      // Check if user exists
      const userExists = await this.userModel.exists(userId);
      if (!userExists) {
        return {
          success: false,
          error: `User with ID ${userId} not found`
        };
      }

      const phoneNumbers = await this.phoneNumberModel.findByUserIdAndPlatform(userId, type);
      
      return {
        success: true,
        data: phoneNumbers
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get user phone numbers by type', { 
        error, 
        user_id: userId, 
        type 
      });
      return {
        success: false,
        error: 'Failed to get phone numbers'
      };
    }
  }

  async updatePhoneNumber(phoneNumberId: string, updateData: UpdatePhoneNumberData): Promise<ServiceResponse<PhoneNumber>> {
    try {
      const validation = validatePhoneNumberId(phoneNumberId);
      throwIfInvalid(validation, 'phone number ID');

      // Check if phone number exists
      const existingPhoneNumber = await this.phoneNumberModel.findById(phoneNumberId);
      if (!existingPhoneNumber) {
        return {
          success: false,
          error: `Phone number with ID ${phoneNumberId} not found`
        };
      }

      const updatedPhoneNumber = await this.phoneNumberModel.update(phoneNumberId, updateData);
      
      return {
        success: true,
        data: updatedPhoneNumber!
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to update phone number', { error, phone_number_id: phoneNumberId });
      return {
        success: false,
        error: 'Failed to update phone number'
      };
    }
  }

  async deletePhoneNumber(phoneNumberId: string): Promise<ServiceResponse<boolean>> {
    try {
      const validation = validatePhoneNumberId(phoneNumberId);
      throwIfInvalid(validation, 'phone number ID');

      // Check if phone number exists
      const existingPhoneNumber = await this.phoneNumberModel.findById(phoneNumberId);
      if (!existingPhoneNumber) {
        return {
          success: false,
          error: `Phone number with ID ${phoneNumberId} not found`
        };
      }

      const deleted = await this.phoneNumberModel.delete(phoneNumberId);
      
      return {
        success: true,
        data: deleted
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to delete phone number', { error, phone_number_id: phoneNumberId });
      return {
        success: false,
        error: 'Failed to delete phone number'
      };
    }
  }

  async getPhoneNumberById(phoneNumberId: string): Promise<ServiceResponse<PhoneNumber>> {
    try {
      const validation = validatePhoneNumberId(phoneNumberId);
      throwIfInvalid(validation, 'phone number ID');

      const phoneNumber = await this.phoneNumberModel.findById(phoneNumberId);
      if (!phoneNumber) {
        return {
          success: false,
          error: `Phone number with ID ${phoneNumberId} not found`
        };
      }

      return {
        success: true,
        data: phoneNumber
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get phone number', { error, phone_number_id: phoneNumberId });
      return {
        success: false,
        error: 'Failed to get phone number'
      };
    }
  }
}