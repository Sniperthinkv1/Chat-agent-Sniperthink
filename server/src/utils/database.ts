import { Pool, PoolClient, QueryResult } from 'pg';
import { databaseConfig } from '../config';
import { logger } from './logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    this.pool = new Pool({
      connectionString: databaseConfig.url,
      max: databaseConfig.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: databaseConfig.timeout,
      ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      this.isConnected = true;
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Database pool error:', { error: err.message, stack: err.stack });
      this.isConnected = false;
    });

    this.pool.on('remove', () => {
      // Silent - no logging needed
    });
  }

  public async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database connection established successfully');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to database:', { error: (error as Error).message });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', { error: (error as Error).message });
      throw error;
    }
  }

  public async query<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      logger.error('Failed to get database client:', { error: (error as Error).message });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back:', { error: (error as Error).message });
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const start = Date.now();
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      const duration = Date.now() - start;

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          responseTime: duration,
          currentTime: result.rows[0]?.current_time,
          version: result.rows[0]?.version?.split(' ')[0],
          poolSize: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: (error as Error).message,
          poolSize: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        },
      };
    }
  }

  public getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  public get isHealthy(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export types for external use
export type { PoolClient, QueryResult } from 'pg';