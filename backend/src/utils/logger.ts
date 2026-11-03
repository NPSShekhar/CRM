type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, { ...meta, error: errorDetails });
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
};
