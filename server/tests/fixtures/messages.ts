/**
 * Test fixtures for Message entities
 */

import { Message, CreateMessageData } from '../../src/models/types';

export const mockUserMessage: Message = {
  message_id: 'msg-123',
  conversation_id: 'conv-123',
  sender: 'user',
  text: 'Hello, I need help with my order',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  status: 'sent',
  sequence_no: 1,
};

export const mockAgentMessage: Message = {
  message_id: 'msg-456',
  conversation_id: 'conv-123',
  sender: 'agent',
  text: 'Hello! I would be happy to help you with your order. Could you please provide your order number?',
  timestamp: new Date('2024-01-01T12:00:30Z'),
  status: 'sent',
  sequence_no: 2,
};

export const mockFailedMessage: Message = {
  message_id: 'msg-789',
  conversation_id: 'conv-123',
  sender: 'agent',
  text: 'This message failed to send',
  timestamp: new Date('2024-01-01T12:01:00Z'),
  status: 'failed',
  sequence_no: 3,
};

export const mockPendingMessage: Message = {
  message_id: 'msg-101',
  conversation_id: 'conv-123',
  sender: 'agent',
  text: 'This message is pending',
  timestamp: new Date('2024-01-01T12:01:30Z'),
  status: 'pending',
  sequence_no: 4,
};

export const mockCreateMessageData: CreateMessageData = {
  message_id: 'new-msg-123',
  conversation_id: 'conv-123',
  sender: 'user',
  text: 'New message text',
  sequence_no: 5,
};

export const mockMessages: Message[] = [
  mockUserMessage,
  mockAgentMessage,
  mockFailedMessage,
  mockPendingMessage,
];
