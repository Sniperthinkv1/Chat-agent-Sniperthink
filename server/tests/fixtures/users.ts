/**
 * Test fixtures for User entities
 */

import { User, CreateUserData } from '../../src/models/types';

export const mockUser: User = {
  user_id: 'test-user-123',
  email: 'test@example.com',
  company_name: 'Test Company',
  created_at: new Date('2024-01-01T00:00:00Z'),
};

export const mockUser2: User = {
  user_id: 'test-user-456',
  email: 'test2@example.com',
  company_name: 'Test Company 2',
  created_at: new Date('2024-01-02T00:00:00Z'),
};

export const mockCreateUserData: CreateUserData = {
  user_id: 'new-user-789',
  email: 'newuser@example.com',
  company_name: 'New Company',
};

export const mockUsers: User[] = [mockUser, mockUser2];
