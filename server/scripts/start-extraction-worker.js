#!/usr/bin/env node

/**
 * Extraction Worker Startup Script
 * Starts only the lead extraction worker
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const extractionWorker = require('../dist/workers/extractionWorker').default;
const { logger } = require('../dist/utils/logger');

async function startExtractionWorker() {
  try {
    const workerId = process.env.WORKER_ID || `extraction-worker-${process.pid}`;

    logger.info('Starting extraction worker...', { 
      workerId,
      pid: process.pid,
      extractionInterval: process.env.EXTRACTION_INTERVAL || '300000'
    });

    await extractionWorker.start();

    logger.info('Extraction worker started successfully', { 
      workerId,
      pid: process.pid
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down extraction worker...`, { workerId });
      
      try {
        await extractionWorker.stop();
        logger.info('Extraction worker stopped successfully', { workerId });
        process.exit(0);
      } catch (error) {
        logger.error('Error during extraction worker shutdown', { 
          workerId,
          error: error.message 
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in extraction worker', {
        workerId,
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection in extraction worker', {
        workerId,
        reason,
        promise
      });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start extraction worker', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start extraction worker
startExtractionWorker();
