// Core TypeScript interfaces for the multi-channel AI agent service

export interface User {
  user_id: string;
  email: string;
  company_name?: string;
  created_at: Date;
}

export interface CreateUserData {
  user_id: string;
  email: string;
  company_name?: string;
}

export interface UpdateUserData {
  email?: string;
  company_name?: string;
}

export interface PhoneNumber {
  id: string;
  user_id: string;
  platform: Platform;
  meta_phone_number_id: string;
  access_token: string;
  display_name?: string;
  created_at: Date;
  updated_at: Date;
}

export type Platform = 'whatsapp' | 'instagram' | 'webchat';
export type PhoneNumberType = Platform; // Alias for backward compatibility

export interface CreatePhoneNumberData {
  id: string;
  user_id: string;
  platform: Platform;
  meta_phone_number_id: string;
  access_token: string;
  display_name?: string;
}

export interface UpdatePhoneNumberData {
  meta_phone_number_id?: string;
  access_token?: string;
  display_name?: string;
}

export interface Agent {
  agent_id: string;
  user_id: string;
  phone_number_id: string; // References phone_numbers.id
  prompt_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAgentData {
  agent_id: string;
  user_id: string;
  phone_number_id: string;
  prompt_id: string;
  name: string;
}

export interface UpdateAgentData {
  name?: string;
  prompt_id?: string;
}

export interface Conversation {
  conversation_id: string;
  agent_id: string;
  customer_phone: string;
  openai_conversation_id?: string; // OpenAI Responses API conversation ID
  created_at: Date;
  last_message_at: Date;
  is_active: boolean;
}

export interface CreateConversationData {
  conversation_id: string;
  agent_id: string;
  customer_phone: string;
  openai_conversation_id?: string; // Optional OpenAI conversation ID
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  status: MessageStatus;
  sequence_no: number;
}

export type MessageSender = 'user' | 'agent';
export type MessageStatus = 'sent' | 'failed' | 'pending';

export interface CreateMessageData {
  message_id: string;
  conversation_id: string;
  sender: MessageSender;
  text: string;
  status?: MessageStatus;
  sequence_no: number;
}

export interface Credits {
  user_id: string;
  remaining_credits: number;
  last_updated: Date;
}

export interface UpdateCreditsData {
  remaining_credits: number;
}

export interface Extraction {
  extraction_id: string;
  conversation_id: string;
  name?: string;
  email?: string;
  company?: string;
  intent?: string;
  urgency?: number; // 1-3
  budget?: number; // 1-3
  fit?: number; // 1-3
  engagement?: number; // 1-3
  demo_datetime?: Date;
  smart_notification?: string;
  extracted_at: Date;
}

export interface CreateExtractionData {
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
  demo_datetime?: Date;
  smart_notification?: string;
}

export interface ConversationArchive {
  archive_id: string;
  old_agent_id: string;
  new_agent_id: string;
  phone_number_id: string;
  archived_at: Date;
}

export interface CreateConversationArchiveData {
  archive_id: string;
  old_agent_id: string;
  new_agent_id: string;
  phone_number_id: string;
}

// Cache interfaces
export interface CachedUserData {
  agent_id: string;
  prompt_id: string;
  remaining_credits: number;
  conversation_id?: string;
}

// Queue interfaces
export interface QueuedMessage {
  message_id: string;
  phone_number_id: string;
  customer_phone: string;
  message_text: string;
  timestamp: string;
  platform_type: PhoneNumberType;
  retryCount?: number;
  lastRetryReason?: string;
  enqueuedAt?: string;
  lastError?: string;
  lastFailedAt?: string;
}

// Service response interfaces
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// OpenAI service interfaces
export interface OpenAICallResult {
  success: boolean;
  response?: string | undefined;
  tokensUsed?: number | undefined;
  conversationId?: string | undefined; // OpenAI conversation ID returned from API
  error?: string | undefined;
  errorCode?: string | undefined;
}

// Database query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}