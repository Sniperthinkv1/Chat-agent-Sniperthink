/**
 * Test fixtures for PhoneNumber entities
 */

import { PhoneNumber, CreatePhoneNumberData } from '../../src/models/types';

export const mockWhatsAppNumber: PhoneNumber = {
  phone_number_id: 'phone-wa-123',
  user_id: 'test-user-123',
  type: 'whatsapp',
  external_number: '+1234567890',
  meta_phone_number_id: 'meta-123456',
  access_token: 'test-access-token-wa',
  display_name: 'Test WhatsApp Number',
  created_at: new Date('2024-01-01T00:00:00Z'),
};

export const mockInstagramAccount: PhoneNumber = {
  phone_number_id: 'phone-ig-456',
  user_id: 'test-user-123',
  type: 'instagram',
  external_number: '@testaccount',
  meta_phone_number_id: 'ig-account-789',
  access_token: 'test-access-token-ig',
  display_name: 'Test Instagram Account',
  created_at: new Date('2024-01-01T00:00:00Z'),
};

export const mockWebChatNumber: PhoneNumber = {
  phone_number_id: 'phone-wc-789',
  user_id: 'test-user-123',
  type: 'webchat',
  external_number: 'webchat-widget-1',
  meta_phone_number_id: null,
  access_token: 'test-access-token-wc',
  display_name: 'Test Web Chat',
  created_at: new Date('2024-01-01T00:00:00Z'),
};

export const mockCreatePhoneNumberData: CreatePhoneNumberData = {
  phone_number_id: 'new-phone-123',
  user_id: 'test-user-123',
  type: 'whatsapp',
  external_number: '+9876543210',
  meta_phone_number_id: 'meta-new-123',
  access_token: 'new-access-token',
  display_name: 'New WhatsApp Number',
};

export const mockPhoneNumbers: PhoneNumber[] = [
  mockWhatsAppNumber,
  mockInstagramAccount,
  mockWebChatNumber,
];
