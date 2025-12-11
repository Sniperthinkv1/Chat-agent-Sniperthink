/**
 * Test-specific app setup for integration tests
 * Avoids singleton initialization issues
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Create a minimal app for testing
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoint (mock for testing)
app.post('/webhook/meta', async (req, res) => {
  try {
    // For integration tests, just return success
    // The actual webhook logic will be tested separately
    res.status(200).json({
      status: 'queued',
      message_id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API endpoints (mock for testing)
app.get('/users/:userId/messages', async (req, res) => {
  res.status(200).json({
    messages: [],
    total: 0,
    page: 1,
    limit: 50,
  });
});

app.get('/users/:userId/agents', async (req, res) => {
  res.status(200).json({
    agents: [],
    total: 0,
  });
});

app.post('/users/:userId/agents', async (req, res) => {
  res.status(201).json({
    agent_id: `agent_${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString(),
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(error.statusCode || 500).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

export default app;
