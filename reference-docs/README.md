# Reference Documentation

This directory contains the authoritative technical reference documentation for the Multi-Channel AI Agent service. These documents serve as the single source of truth for database schemas, API specifications, and system architecture.

## Critical Reference Documents

### Database Schema (`database.md`)
- Complete database schema with all tables, columns, and relationships
- Index specifications and performance considerations
- Query patterns and optimization guidelines
- Migration procedures and versioning

### Instagram Messaging API (`instagramapi.md`)
- Instagram Business API integration details
- Webhook configuration and message handling
- Authentication and access token management
- Rate limiting and error handling

### WhatsApp Business API (`whatsappapi.md`)
- WhatsApp Business API integration specifications
- Message types and formatting requirements
- Webhook payload structures
- Authentication and security considerations

### System Architecture (`architecture.md`)
- Multi-worker architecture design
- Redis-based message queuing system
- Distributed locking mechanisms
- Scalability and performance patterns

### Deployment Guide (`deployment.md`)
- Production deployment procedures
- Environment configuration
- Monitoring and logging setup
- Backup and recovery procedures

### Troubleshooting Guide (`troubleshooting.md`)
- Common issues and solutions
- Debugging procedures
- Performance optimization
- Error code references

## Usage Guidelines

### For Developers
1. **Always consult these docs** before implementing database operations or API integrations
2. **Update docs immediately** when making schema or API changes
3. **Reference docs are mandatory** - implementation should not proceed without them

### For AI Assistants
1. **Read relevant reference docs** before starting any implementation
2. **Stop and request docs** if required reference documentation is missing
3. **Update reference docs** when implementing changes that affect schemas or APIs
4. **Use docs as authoritative source** for all technical specifications

## Maintenance

These documents must be kept current and accurate. Any changes to database schemas, API integrations, or system architecture must be reflected in the corresponding reference documentation immediately.