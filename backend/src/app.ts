import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/index.js';
import { connectDatabase } from './config/db.js';
import { verifyEmailConnection } from './services/email.service.js';
import { IncomingEmailService } from './services/incoming-email.service.js';
import { RealtimeNotificationService } from './services/realtime-notification.service.js';
import { BootstrapService } from './services/bootstrap.service.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [config.appUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting (100 requests per 15 minutes per IP for general API, excluding webhook if needed)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
});
app.use('/api', limiter);
app.use('/api/v1', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static directory for file attachments
app.use('/uploads', express.static(config.uploads.dir));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// API Routes (versioned v1 and legacy /api backward-compatible)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// Centralized error handling
app.use(errorHandler);

// Server startup
if (process.env.NODE_ENV !== 'test') {
  connectDatabase().then(async () => {
    // Idempotent Super Admin bootstrap from environment variables
    await BootstrapService.bootstrapAdmin();

    // Clean up any legacy demo users from development database
    await BootstrapService.cleanupDemoUsers();

    // Non-blocking SMTP verification on startup
    verifyEmailConnection().catch((err) => {
      logger.warn(`Initial SMTP check encountered an error: ${err?.message || err}`);
    });

    // Start background Gmail IMAP incoming email listener
    IncomingEmailService.startListener().catch((err) => {
      logger.warn(`Initial IMAP listener start encountered an error: ${err?.message || err}`);
    });

    const server = app.listen(config.port, () => {
      logger.info(`Enterprise CRM Server running on port ${config.port} (${config.env})`);
      logger.info(`API Base URL: ${config.apiUrl}/api`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async () => {
      logger.info('Shutting down Enterprise CRM Server...');
      RealtimeNotificationService.shutdown();
      await IncomingEmailService.stopListener().catch(() => {});
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  });
}

export default app;
