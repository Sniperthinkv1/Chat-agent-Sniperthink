import { PhoneNumberType, ValidationResult } from '../models/types';

export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
    if (email.length > 255) {
      errors.push('Email must be less than 255 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUserId = (userId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!userId || typeof userId !== 'string') {
    errors.push('User ID is required and must be a string');
  } else {
    if (userId.length < 1 || userId.length > 50) {
      errors.push('User ID must be between 1 and 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
      errors.push('User ID can only contain alphanumeric characters, underscores, and hyphens');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhoneNumberId = (phoneNumberId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!phoneNumberId || typeof phoneNumberId !== 'string') {
    errors.push('Phone number ID is required and must be a string');
  } else {
    if (phoneNumberId.length < 1 || phoneNumberId.length > 50) {
      errors.push('Phone number ID must be between 1 and 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(phoneNumberId)) {
      errors.push('Phone number ID can only contain alphanumeric characters, underscores, and hyphens');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhoneNumberType = (type: string): ValidationResult => {
  const errors: string[] = [];
  const validTypes: PhoneNumberType[] = ['whatsapp', 'instagram', 'webchat'];
  
  if (!type || typeof type !== 'string') {
    errors.push('Phone number type is required and must be a string');
  } else if (!validTypes.includes(type as PhoneNumberType)) {
    errors.push(`Phone number type must be one of: ${validTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateExternalNumber = (externalNumber: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!externalNumber || typeof externalNumber !== 'string') {
    errors.push('External number is required and must be a string');
  } else {
    if (externalNumber.length < 1 || externalNumber.length > 100) {
      errors.push('External number must be between 1 and 100 characters');
    }
    // Allow various formats for different platforms
    if (!/^[a-zA-Z0-9@._+-]+$/.test(externalNumber)) {
      errors.push('External number contains invalid characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAccessToken = (accessToken: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!accessToken || typeof accessToken !== 'string') {
    errors.push('Access token is required and must be a string');
  } else {
    if (accessToken.length < 10) {
      errors.push('Access token must be at least 10 characters long');
    }
    if (accessToken.length > 1000) {
      errors.push('Access token must be less than 1000 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateDisplayName = (displayName?: string): ValidationResult => {
  const errors: string[] = [];
  
  if (displayName !== undefined) {
    if (typeof displayName !== 'string') {
      errors.push('Display name must be a string');
    } else if (displayName.length > 255) {
      errors.push('Display name must be less than 255 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCompanyName = (companyName?: string): ValidationResult => {
  const errors: string[] = [];
  
  if (companyName !== undefined) {
    if (typeof companyName !== 'string') {
      errors.push('Company name must be a string');
    } else if (companyName.length > 255) {
      errors.push('Company name must be less than 255 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAgentId = (agentId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!agentId || typeof agentId !== 'string') {
    errors.push('Agent ID is required and must be a string');
  } else {
    if (agentId.length < 1 || agentId.length > 50) {
      errors.push('Agent ID must be between 1 and 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(agentId)) {
      errors.push('Agent ID can only contain alphanumeric characters, underscores, and hyphens');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePromptId = (promptId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!promptId || typeof promptId !== 'string') {
    errors.push('Prompt ID is required and must be a string');
  } else {
    if (promptId.length < 1 || promptId.length > 100) {
      errors.push('Prompt ID must be between 1 and 100 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAgentName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Agent name is required and must be a string');
  } else {
    if (name.length < 1 || name.length > 255) {
      errors.push('Agent name must be between 1 and 255 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCredits = (credits: number): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof credits !== 'number') {
    errors.push('Credits must be a number');
  } else {
    if (credits < 0) {
      errors.push('Credits cannot be negative');
    }
    if (!Number.isInteger(credits)) {
      errors.push('Credits must be an integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUrgencyLevel = (urgency?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (urgency !== undefined) {
    if (typeof urgency !== 'number') {
      errors.push('Urgency must be a number');
    } else if (!Number.isInteger(urgency) || urgency < 1 || urgency > 3) {
      errors.push('Urgency must be an integer between 1 and 3');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateBudgetLevel = (budget?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (budget !== undefined) {
    if (typeof budget !== 'number') {
      errors.push('Budget must be a number');
    } else if (!Number.isInteger(budget) || budget < 1 || budget > 3) {
      errors.push('Budget must be an integer between 1 and 3');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateFitLevel = (fit?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (fit !== undefined) {
    if (typeof fit !== 'number') {
      errors.push('Fit must be a number');
    } else if (!Number.isInteger(fit) || fit < 1 || fit > 3) {
      errors.push('Fit must be an integer between 1 and 3');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateEngagementLevel = (engagement?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (engagement !== undefined) {
    if (typeof engagement !== 'number') {
      errors.push('Engagement must be a number');
    } else if (!Number.isInteger(engagement) || engagement < 1 || engagement > 3) {
      errors.push('Engagement must be an integer between 1 and 3');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Composite validation functions
export const validateCreateUserData = (data: any): ValidationResult => {
  const allErrors: string[] = [];
  
  const userIdValidation = validateUserId(data.user_id);
  const emailValidation = validateEmail(data.email);
  const companyNameValidation = validateCompanyName(data.company_name);
  
  allErrors.push(...userIdValidation.errors);
  allErrors.push(...emailValidation.errors);
  allErrors.push(...companyNameValidation.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

export const validateCreatePhoneNumberData = (data: any): ValidationResult => {
  const allErrors: string[] = [];
  
  const phoneNumberIdValidation = validatePhoneNumberId(data.phone_number_id);
  const userIdValidation = validateUserId(data.user_id);
  const typeValidation = validatePhoneNumberType(data.type);
  const externalNumberValidation = validateExternalNumber(data.external_number);
  const accessTokenValidation = validateAccessToken(data.access_token);
  const displayNameValidation = validateDisplayName(data.display_name);
  
  allErrors.push(...phoneNumberIdValidation.errors);
  allErrors.push(...userIdValidation.errors);
  allErrors.push(...typeValidation.errors);
  allErrors.push(...externalNumberValidation.errors);
  allErrors.push(...accessTokenValidation.errors);
  allErrors.push(...displayNameValidation.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

export const throwIfInvalid = (validation: ValidationResult, context: string): void => {
  if (!validation.isValid) {
    throw new ValidationError(`Validation failed for ${context}`, validation.errors);
  }
};