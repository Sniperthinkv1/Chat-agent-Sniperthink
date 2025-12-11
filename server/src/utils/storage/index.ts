/**
 * Storage Factory
 * Creates appropriate storage implementation based on configuration
 */

import { IStorage } from './IStorage';
import { InMemoryStorage } from './InMemoryStorage';
import { logger } from '../logger';

let storageInstance: IStorage | null = null;

export function createStorage(): IStorage {
  if (storageInstance) {
    return storageInstance;
  }

  // Always use in-memory storage (Redis removed)
  logger.info('Initializing in-memory storage');
  storageInstance = new InMemoryStorage();

  return storageInstance;
}

export async function initializeStorage(): Promise<IStorage> {
  const storage = createStorage();
  await storage.connect();
  return storage;
}

export async function closeStorage(): Promise<void> {
  if (storageInstance) {
    await storageInstance.disconnect();
    storageInstance = null;
  }
}

// Export singleton instance
export const storage = createStorage();

// Export types
export * from './IStorage';
