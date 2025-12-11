/**
 * Test fixtures for Extraction entities
 */

import { Extraction, CreateExtractionData } from '../../src/models/types';

export const mockExtraction: Extraction = {
  extraction_id: 'ext-123',
  conversation_id: 'conv-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  company: 'Acme Corporation',
  intent: 'Purchase enterprise plan',
  urgency: 3,
  budget: 3,
  fit: 3,
  engagement: 3,
  demo_datetime: new Date('2024-01-15T14:00:00Z'),
  smart_notification: 'High-value lead: Enterprise plan interest, budget confirmed, demo scheduled',
  extracted_at: new Date('2024-01-01T12:30:00Z'),
};

export const mockExtraction2: Extraction = {
  extraction_id: 'ext-456',
  conversation_id: 'conv-456',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  company: 'Tech Startup Inc',
  intent: 'Exploring options',
  urgency: 1,
  budget: 2,
  fit: 2,
  engagement: 2,
  demo_datetime: null,
  smart_notification: 'Medium-value lead: Early stage exploration, moderate fit',
  extracted_at: new Date('2024-01-02T12:30:00Z'),
};

export const mockPartialExtraction: Extraction = {
  extraction_id: 'ext-789',
  conversation_id: 'conv-789',
  name: 'Bob Johnson',
  email: null,
  company: null,
  intent: 'General inquiry',
  urgency: 1,
  budget: 1,
  fit: 1,
  engagement: 1,
  demo_datetime: null,
  smart_notification: 'Low-value lead: Limited information, low engagement',
  extracted_at: new Date('2024-01-03T12:30:00Z'),
};

export const mockCreateExtractionData: CreateExtractionData = {
  extraction_id: 'new-ext-123',
  conversation_id: 'conv-123',
  name: 'Alice Williams',
  email: 'alice@example.com',
  company: 'New Company LLC',
  intent: 'Product demo request',
  urgency: 2,
  budget: 2,
  fit: 2,
  engagement: 2,
  demo_datetime: new Date('2024-01-20T10:00:00Z'),
  smart_notification: 'Medium-value lead: Demo requested, good fit',
};

export const mockExtractions: Extraction[] = [
  mockExtraction,
  mockExtraction2,
  mockPartialExtraction,
];
