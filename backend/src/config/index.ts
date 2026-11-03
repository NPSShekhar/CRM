import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from cwd, backend/.env, or root
dotenv.config();
const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'crm-super-secret-jwt-key-production-ready',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'chandra2001ks@gmail.com',
    fromName: process.env.SMTP_FROM_NAME || 'Enterprise CRM Support',
  },
  support: {
    email: process.env.SUPPORT_EMAIL || 'chandra2001ks@gmail.com',
    whatsapp: process.env.SUPPORT_WHATSAPP || '6303803352',
  },
  imap: {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || process.env.SMTP_USER || 'chandra2001ks@gmail.com',
    password: process.env.IMAP_PASSWORD || process.env.IMAP_PASS || process.env.SMTP_PASS || '',
    tls: process.env.IMAP_TLS !== 'false',
  },
  uploads: {
    dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024,
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@SecurePassword123',
  },
};
