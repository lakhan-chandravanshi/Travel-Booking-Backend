import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, validated access to environment variables.
 * Importing this module guarantees the required variables are present
 * (in production) and provides sensible defaults for local development.
 */
const required = ['MONGODB_URI', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length && process.env.NODE_ENV === 'production') {
  // Fail fast in production — never boot with a broken config.
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel-booking',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  ai: {
    provider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
  },

  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    publicUrl: process.env.AWS_S3_PUBLIC_URL || '',
  },
};

/** True when real S3 credentials + bucket are configured. */
export const isS3Configured = Boolean(
  env.aws.accessKeyId && env.aws.secretAccessKey && env.aws.bucket
);

export default env;
