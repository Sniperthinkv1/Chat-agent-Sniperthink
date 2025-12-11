/**
 * Test fixtures for Agent entities
 */

import { Agent, CreateAgentData } from '../../src/models/types';

export const mockAgent: Agent = {
  agent_id: 'agent-123',
  user_id: 'test-user-123',
  phone_number_id: 'phone-wa-123',
  prompt_id: 'prompt-abc-123',
  name: 'Test Customer Support Agent',
  created_at: new Date('2024-01-01T00:00:00Z'),
};

export const mockAgent2: Agent = {
  agent_id: 'agent-456',
  user_id: 'test-user-123',
  phone_number_id: 'phone-ig-456',
  prompt_id: 'prompt-def-456',
  name: 'Test Sales Agent',
  created_at: new Date('2024-01-02T00:00:00Z'),
};

export const mockCreateAgentData: CreateAgentData = {
  agent_id: 'new-agent-789',
  user_id: 'test-user-123',
  phone_number_id: 'phone-wa-123',
  prompt_id: 'prompt-ghi-789',
  name: 'New Support Agent',
};

export const mockAgents: Agent[] = [mockAgent, mockAgent2];
