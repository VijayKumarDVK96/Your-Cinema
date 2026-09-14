export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta, (key, value) => {
      // Prevent logging sensitive tokens or passwords
      if (['password', 'passwordHash', 'token', 'refreshToken', 'apiKey', 'secret'].includes(key)) {
        return '***REDACTED***';
      }
      return value;
    })}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  static info(message: string, meta?: any) {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  static warn(message: string, meta?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  static error(message: string, error?: any, meta?: any) {
    const errDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(this.formatMessage(LogLevel.ERROR, message, { error: errDetails, ...meta }));
  }

  static debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }
}
