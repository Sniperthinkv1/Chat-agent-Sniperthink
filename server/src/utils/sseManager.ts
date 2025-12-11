import { Response } from 'express';
import { logger } from './logger';

/**
 * SSE Connection Manager
 * Manages Server-Sent Events connections for real-time webchat
 */

interface SSEConnection {
  response: Response;
  sessionId: string;
  webchatId: string;
  connectedAt: Date;
}

class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  /**
   * Add new SSE connection
   */
  addConnection(sessionId: string, webchatId: string, response: Response): void {
    const connectionId = this.getConnectionId(sessionId, webchatId);
    
    // Remove old connection if exists
    this.removeConnection(sessionId, webchatId);

    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial comment to establish connection
    response.write(': SSE connection established\n\n');
    response.flushHeaders();
    
    // Store connection
    this.connections.set(connectionId, {
      response,
      sessionId,
      webchatId,
      connectedAt: new Date()
    });

    logger.info('SSE connection established', {
      session_id: sessionId,
      webchat_id: webchatId,
      total_connections: this.connections.size
    });

    // Send initial connection success event
    this.sendEvent(sessionId, webchatId, 'connected', { status: 'connected' });
  }

  /**
   * Remove SSE connection
   */
  removeConnection(sessionId: string, webchatId: string): void {
    const connectionId = this.getConnectionId(sessionId, webchatId);
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        // Connection already closed
      }
      
      this.connections.delete(connectionId);
      
      logger.info('SSE connection closed', {
        session_id: sessionId,
        webchat_id: webchatId,
        total_connections: this.connections.size
      });
    }
  }

  /**
   * Send message to specific session
   * Uses default event type (no event: line) so onmessage handler works
   */
  sendMessage(sessionId: string, webchatId: string, message: any): boolean {
    const connectionId = this.getConnectionId(sessionId, webchatId);
    const connection = this.connections.get(connectionId);

    if (!connection) {
      logger.warn('SSE connection not found', {
        session_id: sessionId,
        webchat_id: webchatId,
        connection_id: connectionId,
        active_connections: Array.from(this.connections.keys())
      });
      return false;
    }

    try {
      // Don't include "event:" line for default message type
      const eventData = `data: ${JSON.stringify(message)}\n\n`;
      connection.response.write(eventData);
      
      // Flush the response to ensure it's sent immediately
      if (typeof connection.response.flush === 'function') {
        connection.response.flush();
      }
      
      logger.info('SSE message sent successfully', {
        session_id: sessionId,
        webchat_id: webchatId,
        message_id: message.message_id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send SSE message', {
        session_id: sessionId,
        error: (error as Error).message
      });
      
      // Remove dead connection
      this.removeConnection(sessionId, webchatId);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(sessionId: string, webchatId: string, isTyping: boolean): boolean {
    return this.sendEvent(sessionId, webchatId, 'typing', { isTyping });
  }

  /**
   * Send generic event
   */
  private sendEvent(sessionId: string, webchatId: string, eventType: string, data: any): boolean {
    const connectionId = this.getConnectionId(sessionId, webchatId);
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return false;
    }

    try {
      const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      connection.response.write(eventData);
      return true;
    } catch (error) {
      logger.error('Failed to send SSE event', {
        session_id: sessionId,
        event_type: eventType,
        error: (error as Error).message
      });
      
      // Remove dead connection
      this.removeConnection(sessionId, webchatId);
      return false;
    }
  }

  /**
   * Send heartbeat to all connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const deadConnections: string[] = [];

      this.connections.forEach((connection, connectionId) => {
        try {
          connection.response.write(': heartbeat\n\n');
        } catch (error) {
          deadConnections.push(connectionId);
        }
      });

      // Clean up dead connections
      deadConnections.forEach(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          this.removeConnection(connection.sessionId, connection.webchatId);
        }
      });

      if (deadConnections.length > 0) {
        logger.info('Cleaned up dead SSE connections', {
          count: deadConnections.length,
          remaining: this.connections.size
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get connection ID
   */
  private getConnectionId(sessionId: string, webchatId: string): string {
    return `${webchatId}:${sessionId}`;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.connections.forEach((connection) => {
      try {
        connection.response.end();
      } catch (error) {
        // Ignore
      }
    });

    this.connections.clear();
    logger.info('SSE Manager shutdown complete');
  }
}

// Singleton instance
export const sseManager = new SSEManager();
