const LOG_LEVEL = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
} as const;

type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL];

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: SerializedError;
}

interface SerializedError {
    message: string;
    name: string;
    stack?: string;
}

const LEVELS: Record<LogLevel, number> = {
    [LOG_LEVEL.DEBUG]: 0,
    [LOG_LEVEL.INFO]: 1,
    [LOG_LEVEL.WARN]: 2,
    [LOG_LEVEL.ERROR]: 3,
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG;

function serializeError(error: unknown): SerializedError | undefined {
    if (!error) return undefined;
    if (error instanceof Error) {
        return {name: error.name, message: error.message, stack: error.stack};
    }
    return {name: 'UnknownError', message: String(error)};
}

function buildEntry(level: LogLevel,
                    message: string,
                    error?: unknown,
                    context?: LogContext): LogEntry {
    const timestamp = new Date().toISOString();

    return {
        level,
        message,
        timestamp: timestamp,
        ...(context && {context}),
        ...(error !== undefined && {error: serializeError(error)}),
    };
}

class Logger {
    private shouldLog(level: LogLevel): boolean {
        return LEVELS[level] >= LEVELS[MIN_LEVEL];
    }

    debug(message: string, context?: LogContext): void {
        if (!this.shouldLog(LOG_LEVEL.DEBUG)) return;
        console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, context ?? '');
    }

    info(message: string, context?: LogContext): void {
        if (!this.shouldLog(LOG_LEVEL.INFO)) return;
        console.info(`[INFO] ${new Date().toISOString()} ${message}`, context ?? '');
    }

    warn(message: string, context?: LogContext): void {
        if (!this.shouldLog(LOG_LEVEL.WARN)) return;
        const entry = buildEntry(LOG_LEVEL.WARN, message, undefined, context);
        console.warn(`[WARN] ${entry.timestamp} ${message}`, context ?? '');
        this.sendToMonitoring(entry);
    }

    error(message: string, error?: unknown, context?: LogContext): void {
        if (!this.shouldLog(LOG_LEVEL.ERROR)) return;
        const entry = buildEntry(LOG_LEVEL.ERROR, message, error, context);
        console.error(`[ERROR] ${entry.timestamp} ${message}`, entry.error, context ?? '');
        this.sendToMonitoring(entry);
    }

    private sendToMonitoring(entry: LogEntry): void {
        if (typeof window === 'undefined') return;
        if (IS_PRODUCTION) {
            // send entry to monitoring service
        }
    }
}

export const logger = new Logger();