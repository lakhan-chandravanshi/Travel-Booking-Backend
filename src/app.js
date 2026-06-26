import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { LOCAL_DIR } from './services/storage.service.js';

const app = express();

app.set('trust proxy', 1); // correct client IPs behind a proxy / load balancer

// ── Security & parsing ──────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Allow the configured client origin(s). CLIENT_URL may be comma-separated.
const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (!env.isProd) app.use(morgan('dev'));

// Broad rate limit as a safety net for the whole API.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Serve locally-stored uploads when S3 isn't configured.
app.use('/uploads', express.static(path.join(LOCAL_DIR)));

// ── Routes ──────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'Travel Booking API',
    docs: '/api/v1/health',
    version: 'v1',
  });
});

app.use('/api/v1', routes);

// ── Errors ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
