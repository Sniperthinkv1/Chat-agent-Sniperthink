import {
  validateEmail,
  validateUserId,
  validatePhoneNumberId,
  validatePhoneNumberType,
  validateExternalNumber,
  validateAccessToken,
  validateDisplayName,
  validateCompanyName,
  validateAgentId,
  validatePromptId,
  validateAgentName,
  validateCredits,
  validateUrgencyLevel,
  validateBudgetLevel,
  validateFitLevel,
  validateEngagementLevel,
  validateCreateUserData,
  validateCreatePhoneNumberData,
  throwIfInvalid,
  ValidationError
} from '../../../src/utils/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email formats', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be a valid email address');
    });

    it('should reject emails longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be less than 255 characters');
    });

    it('should reject empty or non-string emails', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail(null as any).isValid).toBe(false);
      expect(validateEmail(undefined as any).isValid).toBe(false);
    });
  });

  describe('validateUserId', () => {
    it('should validate correct user IDs', () => {
      const result = validateUserId('user-123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject user IDs with invalid characters', () => {
      const result = validateUserId('user@123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID can only contain alphanumeric characters, underscores, and hyphens');
    });

    it('should reject user IDs outside length bounds', () => {
      expect(validateUserId('').isValid).toBe(false);
      expect(validateUserId('a'.repeat(51)).isValid).toBe(false);
    });
  });

  describe('validatePhoneNumberType', () => {
    it('should validate correct phone number types', () => {
      expect(validatePhoneNumberType('whatsapp').isValid).toBe(true);
      expect(validatePhoneNumberType('instagram').isValid).toBe(true);
      expect(validatePhoneNumberType('webchat').isValid).toBe(true);
    });

    it('should reject invalid phone number types', () => {
      const result = validatePhoneNumberType('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be one of');
    });
  });

  describe('validateAccessToken', () => {
    it('should validate correct access tokens', () => {
      const result = validateAccessToken('valid-token-1234567890');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject tokens that are too short', () => {
      const result = validateAccessToken('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Access token must be at least 10 characters long');
    });

    it('should reject tokens that are too long', () => {
      const result = validateAccessToken('a'.repeat(1001));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Access token must be less than 1000 characters');
    });
  });

  describe('validateCredits', () => {
    it('should validate positive integer credits', () => {
      const result = validateCredits(100);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative credits', () => {
      const result = validateCredits(-10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credits cannot be negative');
    });

    it('should reject non-integer credits', () => {
      const result = validateCredits(10.5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credits must be an integer');
    });

    it('should reject non-number credits', () => {
      const result = validateCredits('100' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credits must be a number');
    });
  });

  describe('validateUrgencyLevel', () => {
    it('should validate urgency levels 1-3', () => {
      expect(validateUrgencyLevel(1).isValid).toBe(true);
      expect(validateUrgencyLevel(2).isValid).toBe(true);
      expect(validateUrgencyLevel(3).isValid).toBe(true);
    });

    it('should allow undefined urgency', () => {
      const result = validateUrgencyLevel(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject urgency outside 1-3 range', () => {
      expect(validateUrgencyLevel(0).isValid).toBe(false);
      expect(validateUrgencyLevel(4).isValid).toBe(false);
    });

    it('should reject non-integer urgency', () => {
      const result = validateUrgencyLevel(1.5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Urgency must be an integer between 1 and 3');
    });
  });

  describe('validateBudgetLevel', () => {
    it('should validate budget levels 1-3', () => {
      expect(validateBudgetLevel(1).isValid).toBe(true);
      expect(validateBudgetLevel(2).isValid).toBe(true);
      expect(validateBudgetLevel(3).isValid).toBe(true);
    });

    it('should allow undefined budget', () => {
      const result = validateBudgetLevel(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject budget outside 1-3 range', () => {
      expect(validateBudgetLevel(0).isValid).toBe(false);
      expect(validateBudgetLevel(4).isValid).toBe(false);
    });
  });

  describe('validateFitLevel', () => {
    it('should validate fit levels 1-3', () => {
      expect(validateFitLevel(1).isValid).toBe(true);
      expect(validateFitLevel(2).isValid).toBe(true);
      expect(validateFitLevel(3).isValid).toBe(true);
    });

    it('should allow undefined fit', () => {
      const result = validateFitLevel(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject fit outside 1-3 range', () => {
      expect(validateFitLevel(0).isValid).toBe(false);
      expect(validateFitLevel(4).isValid).toBe(false);
    });
  });

  describe('validateEngagementLevel', () => {
    it('should validate engagement levels 1-3', () => {
      expect(validateEngagementLevel(1).isValid).toBe(true);
      expect(validateEngagementLevel(2).isValid).toBe(true);
      expect(validateEngagementLevel(3).isValid).toBe(true);
    });

    it('should allow undefined engagement', () => {
      const result = validateEngagementLevel(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject engagement outside 1-3 range', () => {
      expect(validateEngagementLevel(0).isValid).toBe(false);
      expect(validateEngagementLevel(4).isValid).toBe(false);
    });
  });

  describe('validateAgentName', () => {
    it('should validate correct agent names', () => {
      const result = validateAgentName('Customer Support Agent');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty agent names', () => {
      const result = validateAgentName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Agent name must be between 1 and 255 characters');
    });

    it('should reject agent names longer than 255 characters', () => {
      const result = validateAgentName('a'.repeat(256));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Agent name must be between 1 and 255 characters');
    });
  });

  describe('validatePromptId', () => {
    it('should validate correct prompt IDs', () => {
      const result = validatePromptId('prompt-abc-123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty prompt IDs', () => {
      const result = validatePromptId('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Prompt ID must be between 1 and 100 characters');
    });

    it('should reject prompt IDs longer than 100 characters', () => {
      const result = validatePromptId('a'.repeat(101));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Prompt ID must be between 1 and 100 characters');
    });
  });

  describe('validateDisplayName', () => {
    it('should validate correct display names', () => {
      const result = validateDisplayName('My Business');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow undefined display names', () => {
      const result = validateDisplayName(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject display names longer than 255 characters', () => {
      const result = validateDisplayName('a'.repeat(256));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Display name must be less than 255 characters');
    });
  });

  describe('validateCompanyName', () => {
    it('should validate correct company names', () => {
      const result = validateCompanyName('Acme Corporation');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow undefined company names', () => {
      const result = validateCompanyName(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should reject company names longer than 255 characters', () => {
      const result = validateCompanyName('a'.repeat(256));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company name must be less than 255 characters');
    });
  });

  describe('validateCreateUserData', () => {
    it('should validate complete user data', () => {
      const userData = {
        user_id: 'user-123',
        email: 'test@example.com',
        company_name: 'Test Company'
      };

      const result = validateCreateUserData(userData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all validation errors', () => {
      const userData = {
        user_id: '',
        email: 'invalid-email',
        company_name: 'a'.repeat(256)
      };

      const result = validateCreateUserData(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCreatePhoneNumberData', () => {
    it('should validate complete phone number data', () => {
      const phoneData = {
        phone_number_id: 'phone-123',
        user_id: 'user-123',
        type: 'whatsapp',
        external_number: '+1234567890',
        access_token: 'valid-token-1234567890',
        display_name: 'My WhatsApp'
      };

      const result = validateCreatePhoneNumberData(phoneData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all validation errors', () => {
      const phoneData = {
        phone_number_id: '',
        user_id: '',
        type: 'invalid',
        external_number: '',
        access_token: 'short',
        display_name: 'a'.repeat(256)
      };

      const result = validateCreatePhoneNumberData(phoneData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('throwIfInvalid', () => {
    it('should not throw for valid data', () => {
      const validation = { isValid: true, errors: [] };
      expect(() => throwIfInvalid(validation, 'test')).not.toThrow();
    });

    it('should throw ValidationError for invalid data', () => {
      const validation = { isValid: false, errors: ['Error 1', 'Error 2'] };
      
      expect(() => throwIfInvalid(validation, 'test data')).toThrow(ValidationError);
      expect(() => throwIfInvalid(validation, 'test data')).toThrow('Validation failed for test data');
    });

    it('should include all errors in thrown exception', () => {
      const validation = { isValid: false, errors: ['Error 1', 'Error 2'] };
      
      try {
        throwIfInvalid(validation, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).errors).toEqual(['Error 1', 'Error 2']);
      }
    });
  });

  describe('validateExternalNumber', () => {
    it('should validate correct external numbers', () => {
      expect(validateExternalNumber('+1234567890').isValid).toBe(true);
      expect(validateExternalNumber('user@instagram').isValid).toBe(true);
      expect(validateExternalNumber('123456789').isValid).toBe(true);
    });

    it('should reject empty external numbers', () => {
      const result = validateExternalNumber('');
      expect(result.isValid).toBe(false);
    });

    it('should reject external numbers with invalid characters', () => {
      const result = validateExternalNumber('invalid#number');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('External number contains invalid characters');
    });
  });

  describe('validatePhoneNumberId', () => {
    it('should validate correct phone number IDs', () => {
      const result = validatePhoneNumberId('phone-123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject phone number IDs with invalid characters', () => {
      const result = validatePhoneNumberId('phone@123');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateAgentId', () => {
    it('should validate correct agent IDs', () => {
      const result = validateAgentId('agent-123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject agent IDs with invalid characters', () => {
      const result = validateAgentId('agent@123');
      expect(result.isValid).toBe(false);
    });
  });
});
