import app from './app';
import { logger } from './utils/logger';

async function startServer() {
  try {
    await app.initialize();
    app.listen();
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

startServer();