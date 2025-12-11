/**
 * Test fixtures for Webhook payloads
 */

export const mockWhatsAppWebhookPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'whatsapp-business-account-id',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+1234567890',
              phone_number_id: 'phone-wa-123',
            },
            contacts: [
              {
                profile: {
                  name: 'John Doe',
                },
                wa_id: '+9876543210',
              },
            ],
            messages: [
              {
                from: '+9876543210',
                id: 'wamid.123456789',
                timestamp: '1704110400',
                text: {
                  body: 'Hello, I need help',
                },
                type: 'text',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

export const mockInstagramWebhookPayload = {
  object: 'instagram',
  entry: [
    {
      id: 'instagram-account-id',
      time: 1704110400,
      messaging: [
        {
          sender: {
            id: '1234567890',
          },
          recipient: {
            id: 'phone-ig-456',
          },
          timestamp: 1704110400000,
          message: {
            mid: 'mid.123456789',
            text: 'Hi, I have a question',
          },
        },
      ],
    },
  ],
};

export const mockWebChatWebhookPayload = {
  phone_number_id: 'phone-wc-789',
  customer_phone: 'webchat-user-123',
  message_text: 'Hello from web chat',
  timestamp: '2024-01-01T12:00:00Z',
  platform_type: 'webchat',
};

export const mockWebhookSignature = 'sha256=test-signature-hash';

export const mockInvalidWebhookPayload = {
  invalid: 'payload',
};
