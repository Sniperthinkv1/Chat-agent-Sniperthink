/**
 * Test helper utilities
 */

import { Pool } from 'pg';
import { RedisClientType } from 'redis';

/**
 * Create a mock database pool
 */
export function createMockPool(): jest.Mocked<Pool> {
  return {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  } as any;
}

/**
 * Create a mock Redis client
 */
export function createMockRedisClient(): jest.Mocked<RedisClientType> {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    setNX: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    exists: jest.fn(),
    ttl: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hGetAll: jest.fn(),
    hDel: jest.fn(),
    lPush: jest.fn(),
    rPop: jest.fn(),
    lLen: jest.fn(),
    sAdd: jest.fn(),
    sIsMember: jest.fn(),
    sRem: jest.fn(),
    on: jest.fn(),
    isOpen: true,
    isReady: true,
  } as any;
}

/**
 * Create a mock Express request
 */
export function createMockRequest(overrides: any = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    url: '/',
    ...overrides,
  };
}

/**
 * Create a mock Express response
 */
export function createMockResponse(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock Express next function
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Wait for a specified time (for async testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random ID for testing
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a mock date that's always consistent
 */
export function createMockDate(isoString: string = '2024-01-01T00:00:00Z'): Date {
  return new Date(isoString);
}

/**
 * Mock console methods for cleaner test output
 */
export function mockConsole(): void {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

/**
 * Restore console methods
 */
export function restoreConsole(): void {
  jest.restoreAllMocks();
}

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAIClient(): any {
  return {
    responses: {
      create: jest.fn(),
    },
    conversations: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  };
}

/**
 * Create a mock Axios instance
 */
export function createMockAxios(): any {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  };
}

/**
 * Assert that a function throws an error with a specific message
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error: any) {
    if (errorMessage && !error.message.includes(errorMessage)) {
      throw new Error(
        `Expected error message to include "${errorMessage}", but got "${error.message}"`
      );
    }
  }
}

/**
 * Create a mock logger
 */
export function createMockLogger(): any {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
}
