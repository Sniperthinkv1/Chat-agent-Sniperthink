/**
 * Multi-Channel AI Agent API Client
 * TypeScript SDK for interacting with the API
 */

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  company_name?: string;
  credits: number;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  user_id: string;
  platform: 'whatsapp' | 'instagram' | 'webchat';
  meta_phone_number_id: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  agent_id: string;
  user_id: string;
  phone_number_id: string;
  prompt_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'pending';
  sequence_no: number;
}

export interface Extraction {
  extraction_id: string;
  conversation_id: string;
  name?: string;
  email?: string;
  company?: string;
  intent?: string;
  urgency?: number;
  budget?: number;
  fit?: number;
  engagement?: number;
  demo_datetime?: string;
  smart_notification?: string;
  extracted_at: string;
}

export class MultiChannelAIClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message || response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // User Management
  async createUser(data: {
    email: string;
    name: string;
    company_name?: string;
  }): Promise<User> {
    return this.request<User>('POST', '/users', data);
  }

  // Phone Number Management
  async addPhoneNumber(
    userId: string,
    data: {
      platform: 'whatsapp' | 'instagram' | 'webchat';
      meta_phone_number_id: string;
      access_token: string;
      display_name?: string;
    }
  ): Promise<PhoneNumber> {
    return this.request<PhoneNumber>(
      'POST',
      `/users/${userId}/phone_numbers`,
      data
    );
  }

  async listPhoneNumbers(userId: string): Promise<{ phone_numbers: PhoneNumber[] }> {
    return this.request<{ phone_numbers: PhoneNumber[] }>(
      'GET',
      `/users/${userId}/phone_numbers`
    );
  }

  async deletePhoneNumber(userId: string, phoneNumberId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/users/${userId}/phone_numbers/${phoneNumberId}`
    );
  }

  // Agent Management
  async createAgent(
    userId: string,
    data: {
      phone_number_id: string;
      prompt_id: string;
      name: string;
    }
  ): Promise<Agent> {
    return this.request<Agent>('POST', `/users/${userId}/agents`, data);
  }

  async listAgents(userId: string): Promise<{ agents: Agent[] }> {
    return this.request<{ agents: Agent[] }>('GET', `/users/${userId}/agents`);
  }

  async getAgent(userId: string, agentId: string): Promise<Agent> {
    return this.request<Agent>('GET', `/users/${userId}/agents/${agentId}`);
  }

  async updateAgent(
    userId: string,
    agentId: string,
    data: { name: string }
  ): Promise<Agent> {
    return this.request<Agent>(
      'PATCH',
      `/users/${userId}/agents/${agentId}`,
      data
    );
  }

  async deleteAgent(userId: string, agentId: string): Promise<void> {
    return this.request<void>('DELETE', `/users/${userId}/agents/${agentId}`);
  }

  // Message Management
  async getMessages(
    userId: string,
    filters?: {
      phone_number_id?: string;
      agent_id?: string;
      conversation_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ messages: Message[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ messages: Message[]; pagination: any }>(
      'GET',
      `/users/${userId}/messages${query}`
    );
  }

  // Credit Management
  async getCredits(userId: string): Promise<{
    user_id: string;
    remaining_credits: number;
    last_updated: string;
  }> {
    return this.request('GET', `/users/${userId}/credits`);
  }

  async addCredits(
    userId: string,
    amount: number
  ): Promise<{
    user_id: string;
    remaining_credits: number;
    added_amount: number;
  }> {
    return this.request('POST', `/users/${userId}/credits`, { amount });
  }

  // Extraction Management
  async getExtractions(
    userId: string,
    filters?: {
      conversation_id?: string;
      agent_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ extractions: Extraction[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ extractions: Extraction[]; pagination: any }>(
      'GET',
      `/users/${userId}/extractions${query}`
    );
  }
}

// Example usage
export async function example() {
  const client = new MultiChannelAIClient({
    baseUrl: 'https://api.example.com/v1',
    apiKey: process.env.API_KEY!,
  });

  // Create user
  const user = await client.createUser({
    email: 'john@example.com',
    name: 'John Doe',
    company_name: 'Acme Corp',
  });

  console.log('User created:', user.user_id);

  // Add WhatsApp number
  const phoneNumber = await client.addPhoneNumber(user.user_id, {
    platform: 'whatsapp',
    meta_phone_number_id: '836990829491415',
    access_token: 'EAAxxxx...',
    display_name: '+1 (234) 567-8900',
  });

  console.log('Phone number added:', phoneNumber.id);

  // Create agent
  const agent = await client.createAgent(user.user_id, {
    phone_number_id: phoneNumber.id,
    prompt_id: 'prompt_xyz789',
    name: 'Customer Support Agent',
  });

  console.log('Agent created:', agent.agent_id);

  // Add credits
  await client.addCredits(user.user_id, 1000);
  console.log('Credits added');

  // Get messages
  const { messages } = await client.getMessages(user.user_id, {
    agent_id: agent.agent_id,
    limit: 10,
  });

  console.log(`Retrieved ${messages.length} messages`);

  // Get extractions
  const { extractions } = await client.getExtractions(user.user_id, {
    agent_id: agent.agent_id,
  });

  console.log(`Retrieved ${extractions.length} extractions`);
}
