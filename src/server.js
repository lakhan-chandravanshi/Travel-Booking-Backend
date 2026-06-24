import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
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
