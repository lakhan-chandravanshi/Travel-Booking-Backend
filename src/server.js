import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { EventEmitter } from 'events';

// Increase default limit for listeners during debugging to avoid noisy warnings.
EventEmitter.defaultMaxListeners = 20;

// Capture Node.js warnings (including MaxListenersExceededWarning) and log stack traces.
process.on('warning', (warning) => {
  logger.warn(`Node warning: ${warning.name} ${warning.message}`);
  if (warning.stack) logger.warn(warning.stack);
});

async function start() {
  try {
    logger.info(`Environment: ${env.nodeEnv}`);
    logger.info(`Connecting to MongoDB (this may take a moment on first request)...`);
    await connectDB();
    const server = app.listen(env.port, () => {
      logger.success(`API ready on http://localhost:${env.port} (${env.nodeEnv})`);
    });

    // Graceful shutdown.
    const shutdown = (signal) => {
      logger.warn(`${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

start();

export default app;



