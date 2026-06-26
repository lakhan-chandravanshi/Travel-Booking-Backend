import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);
// Increase the amount of time Mongoose will wait for operations
// to stop buffering while attempting to connect (default 10000ms).
mongoose.set('bufferTimeoutMS', 30000);

/**
 * Establish a connection to MongoDB with retry logic.
 * Includes proper timeout and pooling configuration for reliability.
 */
export async function connectDB(maxRetries = 3) {
  let lastError;

  // Mask password for safe logging
  const maskedUri = env.mongoUri?.replace(/:[^@]+@/, ':****@') || 'NOT SET';
  logger.info(`Attempting to connect to MongoDB: ${maskedUri}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
      });
      logger.success(
        `MongoDB connected (attempt ${attempt}): ${conn.connection.host}/${conn.connection.name}`
      );
      return conn;
    } catch (error) {
      lastError = error;
      logger.warn(
        `MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.warn(`Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  logger.error(`MongoDB connection failed after ${maxRetries} attempts`);
  throw lastError;
}

export default connectDB;
