/**
 * Phone Number Formatter Utility
 * Handles conversion to E.164 format and validation for WhatsApp messaging
 */

import { logger } from './logger';

/**
 * Converts a phone number to E.164 format (+14155551234)
 * Handles various input formats:
 * - +1 415 555 1234
 * - 1-415-555-1234
 * - (415) 555-1234
 * - 4155551234
 * - 14155551234
 * 
 * @param phone - The phone number to format
 * @param defaultCountryCode - Default country code if not provided (default: '1' for US)
 * @returns E.164 formatted phone number or null if invalid
 */
export function toE164(phone: string, defaultCountryCode: string = '1'): string | null {
    if (!phone || typeof phone !== 'string') {
        return null;
    }

    // Remove all non-digit characters except leading +
    let cleaned = phone.trim();
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\D/g, '');

    if (!cleaned) {
        return null;
    }

    // If original had +, it should include country code
    if (hasPlus) {
        // Validate minimum length (country code + some digits)
        if (cleaned.length < 7 || cleaned.length > 15) {
            logger.warn(`Invalid E.164 phone length: ${cleaned.length}`, { phone });
            return null;
        }
        return `+${cleaned}`;
    }

    // Check if number already has country code (starts with common codes)
    // Common country codes: 1 (US/CA), 44 (UK), 91 (India), etc.
    const commonCountryCodes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', 
        '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', 
        '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', 
        '90', '91', '92', '93', '94', '95', '98', '212', '213', '216', '218', '220', '221',
        '222', '223', '224', '225', '226', '227', '228', '229', '230', '231', '232', '233',
        '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245',
        '246', '247', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257',
        '258', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269', '290',
        '291', '297', '298', '299', '350', '351', '352', '353', '354', '355', '356', '357',
        '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '379',
        '380', '381', '382', '383', '385', '386', '387', '389', '420', '421', '423', '500',
        '501', '502', '503', '504', '505', '506', '507', '508', '509', '590', '591', '592',
        '593', '594', '595', '596', '597', '598', '599', '670', '672', '673', '674', '675',
        '676', '677', '678', '679', '680', '681', '682', '683', '685', '686', '687', '688',
        '689', '690', '691', '692', '850', '852', '853', '855', '856', '880', '886', '960',
        '961', '962', '963', '964', '965', '966', '967', '968', '970', '971', '972', '973',
        '974', '975', '976', '977', '992', '993', '994', '995', '996', '998'];

    // Check for US/CA format (10 or 11 digits starting with 1)
    if (cleaned.length === 10) {
        // Assume US/CA, add country code
        cleaned = defaultCountryCode + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        // Already has US/CA country code
        // Keep as is
    } else {
        // Try to detect country code from start
        let foundCountryCode = false;
        for (const code of commonCountryCodes) {
            if (cleaned.startsWith(code) && cleaned.length >= code.length + 6) {
                foundCountryCode = true;
                break;
            }
        }
        
        if (!foundCountryCode && cleaned.length >= 6 && cleaned.length <= 12) {
            // Assume missing country code, prepend default
            cleaned = defaultCountryCode + cleaned;
        }
    }

    // Final validation
    if (cleaned.length < 7 || cleaned.length > 15) {
        logger.warn(`Phone number invalid length after processing: ${cleaned.length}`, { phone, cleaned });
        return null;
    }

    return `+${cleaned}`;
}

/**
 * Validates if a phone number is in valid E.164 format
 * E.164: + followed by 7-15 digits
 * 
 * @param phone - The phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidE164(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
        return false;
    }

    // E.164 format: + followed by 7-15 digits
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    return e164Regex.test(phone);
}

/**
 * Formats a phone number for display (adds spaces for readability)
 * +14155551234 -> +1 415 555 1234
 * 
 * @param phone - E.164 phone number
 * @returns Formatted phone for display
 */
export function formatForDisplay(phone: string): string {
    if (!isValidE164(phone)) {
        return phone; // Return as-is if not valid E.164
    }

    // Remove + for processing
    const digits = phone.substring(1);

    // Format based on country code patterns
    if (digits.startsWith('1') && digits.length === 11) {
        // US/CA: +1 XXX XXX XXXX
        return `+1 ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
    }

    if (digits.startsWith('44') && digits.length >= 11) {
        // UK: +44 XXXX XXXXXX
        return `+44 ${digits.substring(2, 6)} ${digits.substring(6)}`;
    }

    if (digits.startsWith('91') && digits.length === 12) {
        // India: +91 XXXXX XXXXX
        return `+91 ${digits.substring(2, 7)} ${digits.substring(7)}`;
    }

    // Default: split into groups of 3-4
    const countryCode = digits.substring(0, 2);
    const rest = digits.substring(2);
    const parts = rest.match(/.{1,4}/g) || [];
    return `+${countryCode} ${parts.join(' ')}`;
}

/**
 * Extracts country code from E.164 phone number
 * 
 * @param phone - E.164 phone number
 * @returns Country code or null
 */
export function getCountryCode(phone: string): string | null {
    if (!isValidE164(phone)) {
        return null;
    }

    const digits = phone.substring(1);

    // Check for single digit country codes (1, 7)
    if (digits.startsWith('1') || digits.startsWith('7')) {
        return digits.substring(0, 1);
    }

    // Check for 2-digit country codes
    const twoDigit = digits.substring(0, 2);
    const twoDigitCodes = ['20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', 
        '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', 
        '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', 
        '92', '93', '94', '95', '98'];
    
    if (twoDigitCodes.includes(twoDigit)) {
        return twoDigit;
    }

    // Check for 3-digit country codes
    const threeDigit = digits.substring(0, 3);
    return threeDigit;
}

/**
 * Batch convert phone numbers to E.164 format
 * 
 * @param phones - Array of phone numbers
 * @param defaultCountryCode - Default country code
 * @returns Object with valid and invalid phones
 */
export function batchToE164(phones: string[], defaultCountryCode: string = '1'): {
    valid: { original: string; formatted: string }[];
    invalid: string[];
} {
    const result = {
        valid: [] as { original: string; formatted: string }[],
        invalid: [] as string[],
    };

    for (const phone of phones) {
        const formatted = toE164(phone, defaultCountryCode);
        if (formatted) {
            result.valid.push({ original: phone, formatted });
        } else {
            result.invalid.push(phone);
        }
    }

    return result;
}
