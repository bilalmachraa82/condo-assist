const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private sessionId: string;

  constructor(logLevel: LogLevel = 'INFO') {
    this.logLevel = logLevel;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
    };
  }

  private getCurrentUserId(): string | undefined {
    // This would be integrated with your auth system
    return undefined;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const method = entry.level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
      console[method](`[${entry.timestamp}] ${entry.message}`, entry.context || '');
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('DEBUG')) {
      this.addLog(this.createLogEntry('DEBUG', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('INFO')) {
      this.addLog(this.createLogEntry('INFO', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('WARN')) {
      this.addLog(this.createLogEntry('WARN', message, context));
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('ERROR')) {
      this.addLog(this.createLogEntry('ERROR', message, context));
    }
  }

  // Performance logging
  time(label: string): void {
    this.debug(`Timer started: ${label}`, { timerLabel: label, action: 'start' });
  }

  timeEnd(label: string): void {
    this.debug(`Timer ended: ${label}`, { timerLabel: label, action: 'end' });
  }

  // API call logging
  logApiCall(method: string, url: string, status: number, duration: number, error?: any): void {
    const level: LogLevel = status >= 400 ? 'ERROR' : 'INFO';
    this.addLog(this.createLogEntry(level, `API ${method} ${url}`, {
      method,
      url,
      status,
      duration,
      error: error?.message,
    }));
  }

  // User action logging
  logUserAction(action: string, details?: Record<string, any>): void {
    this.info(`User action: ${action}`, { action, ...details });
  }

  // Error boundary logging
  logReactError(error: Error, errorInfo: any): void {
    this.error('React Error Boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  // Get logs for debugging
  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logs];
    return this.logs.filter(log => LOG_LEVELS[log.level] >= LOG_LEVELS[level]);
  }

  // Export logs for support
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      logs: this.logs,
    }, null, 2);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${level}`);
  }
}

// Global logger instance
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? 'DEBUG' : 'WARN'
);

// Performance monitoring utilities
export const performanceMonitor = {
  measureFunction: <T extends (...args: any[]) => any>(fn: T, label: string): T => {
    return ((...args: any[]) => {
      const start = performance.now();
      logger.time(label);
      
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = performance.now() - start;
            logger.timeEnd(label);
            logger.debug(`Function ${label} completed`, { duration });
          });
        }
        
        const duration = performance.now() - start;
        logger.timeEnd(label);
        logger.debug(`Function ${label} completed`, { duration });
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        logger.error(`Function ${label} failed`, { duration, error: (error as Error).message });
        throw error;
      }
    }) as T;
  },

  measureApiCall: async <T>(
    apiCall: () => Promise<T>,
    method: string,
    url: string
  ): Promise<T> => {
    const start = performance.now();
    let status = 0;
    
    try {
      const result = await apiCall();
      status = 200; // Assume success if no error
      return result;
    } catch (error: any) {
      status = error.status || error.statusCode || 500;
      throw error;
    } finally {
      const duration = performance.now() - start;
      logger.logApiCall(method, url, status, duration);
    }
  },
};

// React Hook for logging user actions
export const useActionLogger = () => {
  return {
    logAction: (action: string, details?: Record<string, any>) => {
      logger.logUserAction(action, details);
    },
    logError: (error: Error, context?: Record<string, any>) => {
      logger.error(error.message, { ...context, stack: error.stack });
    },
    logPageView: (page: string) => {
      logger.info(`Page view: ${page}`, { page, timestamp: Date.now() });
    },
  };
};