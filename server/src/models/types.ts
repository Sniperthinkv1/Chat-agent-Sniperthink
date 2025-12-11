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

// ============================================================
// WhatsApp Template System Types
// ============================================================

// Rate limit tiers for WhatsApp messaging
export type MessageTier = 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED';

// Extended PhoneNumber with rate limiting fields
export interface PhoneNumberWithRateLimit extends PhoneNumber {
  waba_id?: string;
  daily_message_limit: number;
  daily_messages_sent: number;
  tier: MessageTier;
  limit_reset_at: Date;
}

export interface UpdatePhoneNumberRateLimitData {
  waba_id?: string;
  daily_message_limit?: number;
  tier?: MessageTier;
}

// Template types
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';

// Template component types (WhatsApp structure)
export interface TemplateHeaderComponent {
  type: 'HEADER';
  format: 'TEXT';
  text: string;
  example?: { header_text: string[] };
}

export interface TemplateBodyComponent {
  type: 'BODY';
  text: string;
  example?: { body_text: string[][] };
}

export interface TemplateFooterComponent {
  type: 'FOOTER';
  text: string;
}

export type TemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

export interface TemplateButton {
  type: TemplateButtonType;
  text: string;
  url?: string; // For URL buttons
  phone_number?: string; // For PHONE_NUMBER buttons
}

export interface TemplateButtonsComponent {
  type: 'BUTTONS';
  buttons: TemplateButton[];
}

export type TemplateComponent = 
  | TemplateHeaderComponent 
  | TemplateBodyComponent 
  | TemplateFooterComponent 
  | TemplateButtonsComponent;

export interface TemplateComponents {
  header?: TemplateHeaderComponent;
  body: TemplateBodyComponent;
  footer?: TemplateFooterComponent;
  buttons?: TemplateButtonsComponent;
}

export interface Template {
  template_id: string;
  user_id: string;
  phone_number_id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  language: string;
  components: TemplateComponents;
  meta_template_id?: string;
  rejection_reason?: string;
  submitted_at?: Date;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplateData {
  template_id: string;
  user_id: string;
  phone_number_id: string;
  name: string;
  category: TemplateCategory;
  language?: string;
  components: TemplateComponents;
}

export interface UpdateTemplateData {
  name?: string;
  category?: TemplateCategory;
  components?: TemplateComponents;
  status?: TemplateStatus;
  meta_template_id?: string;
  rejection_reason?: string;
  submitted_at?: Date;
  approved_at?: Date;
}

// Template variable types
export type ExtractionFieldMapping = 
  | 'name' 
  | 'email' 
  | 'company' 
  | 'customer_phone'
  | 'intent_level' 
  | 'urgency_level' 
  | 'lead_status_tag'
  | 'total_score' 
  | 'smart_notification';

export type TemplateComponentType = 'HEADER' | 'BODY' | 'BUTTON';

export interface TemplateVariable {
  variable_id: string;
  template_id: string;
  variable_name: string;
  position: number; // 1-10, maps to {{1}}-{{10}}
  component_type: TemplateComponentType;
  extraction_field?: ExtractionFieldMapping;
  default_value?: string;
  sample_value?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplateVariableData {
  variable_id: string;
  template_id: string;
  variable_name: string;
  position: number;
  component_type?: TemplateComponentType;
  extraction_field?: ExtractionFieldMapping;
  default_value?: string;
  sample_value?: string;
}

// Template send tracking
export type TemplateSendStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface TemplateSend {
  send_id: string;
  template_id: string;
  conversation_id?: string;
  campaign_id?: string;
  customer_phone: string;
  variable_values: Record<string, string>; // { "1": "John", "2": "Acme Corp" }
  status: TemplateSendStatus;
  platform_message_id?: string;
  error_code?: string;
  error_message?: string;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplateSendData {
  send_id: string;
  template_id: string;
  conversation_id?: string;
  campaign_id?: string;
  customer_phone: string;
  variable_values?: Record<string, string>;
}

// ============================================================
// Contact Management Types
// ============================================================

export type ContactSource = 'EXTRACTION' | 'IMPORT' | 'MANUAL';

export interface Contact {
  contact_id: string;
  user_id: string;
  phone: string; // E.164 format
  name?: string;
  email?: string;
  company?: string;
  tags: string[];
  source: ContactSource;
  extraction_id?: string;
  conversation_id?: string;
  is_active: boolean;
  opted_out: boolean;
  opted_out_at?: Date;
  last_contacted_at?: Date;
  total_messages_sent: number;
  total_messages_received: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContactData {
  contact_id: string;
  user_id: string;
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  source?: ContactSource;
  extraction_id?: string;
  conversation_id?: string;
}

export interface UpdateContactData {
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  is_active?: boolean;
  opted_out?: boolean;
  last_contacted_at?: Date;
}

export interface ContactFilter {
  tags?: string[];
  excludeTags?: string[];
  source?: ContactSource;
  isActive?: boolean;
  optedOut?: boolean;
}

// ============================================================
// Campaign Types
// ============================================================

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface CampaignRecipientFilter {
  tags?: string[];
  excludeTags?: string[];
  contactIds?: string[];
}

export interface Campaign {
  campaign_id: string;
  user_id: string;
  template_id: string;
  phone_number_id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  recipient_filter: CampaignRecipientFilter;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  started_at?: Date;
  completed_at?: Date;
  paused_at?: Date;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCampaignData {
  campaign_id: string;
  user_id: string;
  template_id: string;
  phone_number_id: string;
  name: string;
  description?: string;
  recipient_filter?: CampaignRecipientFilter;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  recipient_filter?: CampaignRecipientFilter;
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  failed_count?: number;
  started_at?: Date;
  completed_at?: Date;
  paused_at?: Date;
  last_error?: string;
}

// Campaign trigger types
export type TriggerType = 'IMMEDIATE' | 'SCHEDULED' | 'EVENT';
export type EventType = 'NEW_EXTRACTION' | 'LEAD_HOT' | 'LEAD_WARM' | 'TAG_ADDED' | 'CONVERSATION_ENDED';

export interface EventConfig {
  tag?: string; // For TAG_ADDED
  inactiveMinutes?: number; // For CONVERSATION_ENDED
}

export interface CampaignTrigger {
  trigger_id: string;
  campaign_id: string;
  trigger_type: TriggerType;
  scheduled_at?: Date;
  event_type?: EventType;
  event_config: EventConfig;
  is_active: boolean;
  last_triggered_at?: Date;
  trigger_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCampaignTriggerData {
  trigger_id: string;
  campaign_id: string;
  trigger_type: TriggerType;
  scheduled_at?: Date;
  event_type?: EventType;
  event_config?: EventConfig;
}

export interface UpdateCampaignTriggerData {
  trigger_type?: TriggerType;
  scheduled_at?: Date;
  event_type?: EventType;
  event_config?: EventConfig;
  is_active?: boolean;
  last_triggered_at?: Date;
  trigger_count?: number;
}

// Campaign recipient tracking
export type CampaignRecipientStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';
export type SkipReason = 'OPTED_OUT' | 'RATE_LIMITED' | 'INVALID_PHONE' | 'DUPLICATE' | 'RECENTLY_CONTACTED';

export interface CampaignRecipient {
  recipient_id: string;
  campaign_id: string;
  contact_id: string;
  template_send_id?: string;
  status: CampaignRecipientStatus;
  skip_reason?: SkipReason;
  error_message?: string;
  queued_at?: Date;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCampaignRecipientData {
  recipient_id: string;
  campaign_id: string;
  contact_id: string;
}

// ============================================================
// Admin Types
// ============================================================

export interface AdminLoginRequest {
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: Date;
}

export interface AdminTokenPayload {
  role: 'super_admin';
  iat: number;
  exp: number;
}

// ============================================================
// Analytics Types
// ============================================================

export interface DashboardStats {
  totalUsers: number;
  totalPhoneNumbers: number;
  totalAgents: number;
  totalConversations: number;
  totalMessages: number;
  totalTemplates: number;
  totalContacts: number;
  totalCampaigns: number;
  activeConversations: number;
  approvedTemplates: number;
  runningCampaigns: number;
}

export interface RateLimitStats {
  phoneNumberId: string;
  displayName?: string;
  tier: MessageTier;
  dailyLimit: number;
  dailySent: number;
  percentUsed: number;
  resetsAt: Date;
}

export interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  progressPercent: number;
}

// ============================================================
// Event System Types
// ============================================================

export interface AppEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface ExtractionCompleteEvent extends AppEvent {
  type: 'extraction.complete';
  payload: {
    extractionId: string;
    conversationId: string;
    userId: string;
    leadStatusTag?: string;
    customerPhone: string;
  };
}

export interface LeadStatusChangedEvent extends AppEvent {
  type: 'lead.statusChanged';
  payload: {
    extractionId: string;
    conversationId: string;
    userId: string;
    previousStatus?: string;
    newStatus: string;
    customerPhone: string;
  };
}

export interface ContactTagAddedEvent extends AppEvent {
  type: 'contact.tagAdded';
  payload: {
    contactId: string;
    userId: string;
    tag: string;
    customerPhone: string;
  };
}

export type SystemEvent = ExtractionCompleteEvent | LeadStatusChangedEvent | ContactTagAddedEvent;