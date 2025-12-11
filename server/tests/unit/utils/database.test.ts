import { Pool } from 'pg';
import { DatabaseConnection } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the config
jest.mock('../../../src/config', () => ({
  databaseConfig: {
    url: 'postgresql://test:test@localhost:5432/test',
    poolSize: 10,
    timeout: 5000,
  },
}));

// Mock pg Pool
jest.mock('pg', () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  };
  
  return {
    Pool: jest.fn().mockImplementation(() => mockPool),
  };
});

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for testing
    (DatabaseConnection as any).instance = undefined;
    
    // Get the mock pool instance
    const { Pool } = require('pg');
    mockPool = Pool.mock.results[Pool.mock.results.length - 1]?.value || {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    };
    
    dbConnection = DatabaseConnection.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseConnection.getInstance();
      const instance2 = DatabaseConnection.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create Pool with correct configuration', () => {
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: false,
      });
    });

    it('should setup event handlers', () => {
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);
      mockClient.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] });

      await dbConnection.connect();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValueOnce(error);

      await expect(dbConnection.connect()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to connect to database:', { error: 'Connection failed' });
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      mockPool.end.mockResolvedValueOnce(undefined);

      await dbConnection.disconnect();

      expect(mockPool.end).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection closed');
    });

    it('should handle disconnection error', async () => {
      const error = new Error('Disconnection failed');
      mockPool.end.mockRejectedValueOnce(error);

      await expect(dbConnection.disconnect()).rejects.toThrow('Disconnection failed');
      expect(logger.error).toHaveBeenCalledWith('Error closing database connection:', { error: 'Disconnection failed' });
    });
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await dbConnection.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
      expect(logger.debug).toHaveBeenCalledWith('Database query executed', expect.objectContaining({
        query: 'SELECT * FROM users WHERE id = $1',
        rowCount: 1,
      }));
    });

    it('should handle query error', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(dbConnection.query('SELECT * FROM invalid_table')).rejects.toThrow('Query failed');
      expect(logger.error).toHaveBeenCalledWith('Database query failed', expect.objectContaining({
        query: 'SELECT * FROM invalid_table',
        error: 'Query failed',
      }));
    });

    it('should truncate long queries in logs', async () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 'condition AND '.repeat(20) + 'id = 1';
      const mockResult = { rows: [], rowCount: 0 };
      mockPool.query.mockResolvedValueOnce(mockResult);

      await dbConnection.query(longQuery);

      expect(logger.debug).toHaveBeenCalledWith('Database query executed', expect.objectContaining({
        query: expect.stringMatching(/\.\.\.$/),
      }));
    });
  });

  describe('getClient', () => {
    it('should return client successfully', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const client = await dbConnection.getClient();

      expect(client).toBe(mockClient);
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should handle client acquisition error', async () => {
      const error = new Error('Client acquisition failed');
      mockPool.connect.mockRejectedValueOnce(error);

      await expect(dbConnection.getClient()).rejects.toThrow('Client acquisition failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to get database client:', { error: 'Client acquisition failed' });
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const callback = jest.fn().mockResolvedValueOnce('success');
      const result = await dbConnection.transaction(callback);

      expect(result).toBe('success');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce(undefined); // ROLLBACK

      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValueOnce(error);

      await expect(dbConnection.transaction(callback)).rejects.toThrow('Transaction failed');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Transaction rolled back:', { error: 'Transaction failed' });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResult = {
        rows: [{
          current_time: new Date(),
          version: 'PostgreSQL 14.0 on x86_64-pc-linux-gnu'
        }]
      };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const health = await dbConnection.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toMatchObject({
        connected: expect.any(Boolean),
        responseTime: expect.any(Number),
        currentTime: expect.any(Date),
        version: 'PostgreSQL',
        poolSize: 5,
        idleCount: 3,
        waitingCount: 0,
      });
    });

    it('should return unhealthy status on error', async () => {
      const error = new Error('Health check failed');
      mockPool.query.mockRejectedValueOnce(error);

      const health = await dbConnection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details).toMatchObject({
        connected: false,
        error: 'Health check failed',
        poolSize: 5,
        idleCount: 3,
        waitingCount: 0,
      });
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', () => {
      const stats = dbConnection.getPoolStats();

      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });
    });
  });

  describe('isHealthy', () => {
    it('should return connection status', () => {
      // Initially false since we haven't connected
      expect(dbConnection.isHealthy).toBe(false);
    });
  });
});