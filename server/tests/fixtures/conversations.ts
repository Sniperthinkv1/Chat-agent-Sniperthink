/**
 * Test fixtures for Conversation entities
 */

import { Conversation, CreateConversationData } from '../../src/models/types';

export const mockConversation: Conversation = {
  conversation_id: 'conv-123',
  agent_id: 'agent-123',
  customer_phone: '+1234567890',
  openai_conversation_id: 'openai-conv-abc-123',
  created_at: new Date('2024-01-01T00:00:00Z'),
  last_message_at: new Date('2024-01-01T12:00:00Z'),
  is_active: true,
};

export const mockConversation2: Conversation = {
  conversation_id: 'conv-456',
  agent_id: 'agent-123',
  customer_phone: '+9876543210',
  openai_conversation_id: 'openai-conv-def-456',
  created_at: new Date('2024-01-02T00:00:00Z'),
  last_message_at: new Date('2024-01-02T12:00:00Z'),
  is_active: true,
};

export const mockInactiveConversation: Conversation = {
  conversation_id: 'conv-789',
  agent_id: 'agent-123',
  customer_phone: '+5555555555',
  openai_conversation_id: 'openai-conv-ghi-789',
  created_at: new Date('2023-12-01T00:00:00Z'),
  last_message_at: new Date('2023-12-01T12:00:00Z'),
  is_active: false,
};

export const mockCreateConversationData: CreateConversationData = {
  conversation_id: 'new-conv-123',
  agent_id: 'agent-123',
  customer_phone: '+1111111111',
  openai_conversation_id: 'openai-conv-new-123',
};

export const mockConversations: Conversation[] = [
  mockConversation,
  mockConversation2,
  mockInactiveConversation,
];
