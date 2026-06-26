type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context);
    }

    // TODO: Send to error monitoring service in production
    this.sendToMonitoring('error', message, error, context);
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context);
    }

    this.sendToMonitoring('warn', message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context);
    }

    this.sendToMonitoring('info', message, undefined, context);
  }

  private sendToMonitoring(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): void {


    if (typeof window !== 'undefined' && !this.isDevelopment) {

    }
  }
}

export const logger = new Logger();


