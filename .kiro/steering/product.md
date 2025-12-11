# Product Overview

## Multi-Channel AI Agent Service

A scalable Node.js backend service that enables businesses to deploy AI chatbots across WhatsApp, Instagram, and Web Chat platforms. The system processes high-volume messages (100+ messages/second), maintains conversation context, and extracts structured lead data.

### Core Value Proposition

- **Multi-tenant architecture** where user_id serves as tenant identifier
- **High-throughput message processing** with strict FIFO ordering per phone number
- **Intelligent lead extraction** from conversations using OpenAI
- **Unified webhook endpoint** for all Meta platforms (WhatsApp, Instagram)
- **Credit-based usage model** with real-time balance tracking

### Key Business Features

- Phone number and Instagram account management with access tokens
- AI agent creation by linking OpenAI prompts to communication channels
- Conversation context persistence with 21-day activity-based purging
- Structured lead data extraction (name, email, company, intent, urgency, budget, fit, engagement)
- Comprehensive REST APIs for agent management and analytics

### Technical Architecture

- **Queue-based processing** using Redis for message ordering and caching
- **OpenAI Response API integration** for AI-powered responses
- **Neon Postgres** for persistent data storage
- **Multi-worker architecture** with auto-scaling based on load
- **Conversation archival system** for agent configuration changes

### Success Metrics

- Message processing throughput: 100+ messages/second
- Message ordering: Strict FIFO per phone_number_id
- Lead extraction accuracy: Structured data with validation
- System reliability: Graceful handling of API failures and worker crashes