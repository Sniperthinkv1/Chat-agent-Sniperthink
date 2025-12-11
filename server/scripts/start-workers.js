#!/usr/bin/env node

/**
 * Optimized Worker Startup Script
 * Starts optimized message workers and extraction worker
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { startOptimizedMessageWorker } = require('../dist/workers/optimizedMessageWorker');
const extractionWorker = require('../dist/workers/extractionWorker').default;
const { logger } = require('../dist/utils/logger');

async function startWorkers() {
  try {
    logger.info('Starting optimized workers...');

    // Get worker count from environment
    const workerCount = parseInt(process.env.MIN_WORKERS || '5', 10);

    // Start optimized message workers
    logger.info(`Starting ${workerCount} optimized message workers...`);
    for (let i = 0; i < workerCount; i++) {
      const workerId = `optimized-worker-${Date.now()}-${i}`;
      startOptimizedMessageWorker(workerId);
      logger.info('Started optimized message worker', { workerId });
    }

    // Start extraction worker
    logger.info('Starting extraction worker...');
    await extractionWorker.start();
    logger.info('Extraction worker started successfully');

    logger.info('All workers started successfully', {
      messageWorkers: workerCount,
      extractionWorker: 'running'
    });

    // Handle graceful shutdown (only register once)
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down workers gracefully...`);
      try {
        await extractionWorker.stop();
        logger.info('All workers stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during worker shutdown', { error: error.message });
        process.exit(1);
      }
    };

    // Increase max listeners for process to support many workers
    process.setMaxListeners(1000);
    
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in worker process', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection in worker process', { reason });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start workers', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

startWorkers();
