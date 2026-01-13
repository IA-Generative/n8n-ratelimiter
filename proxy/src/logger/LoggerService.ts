import type { Logger } from 'pino'
import process from 'node:process'
import pino from 'pino'

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

export interface LoggerConfig {
  level?: LogLevel
  pretty?: boolean
}

/**
 * Service for application-wide logging using Pino
 */
export class LoggerService {
  private readonly logger: Logger
  private static instance: LoggerService | null = null

  constructor(config: LoggerConfig = {}) {
    const level = config.level || this.getLogLevelFromEnv()
    const pretty = config.pretty ?? process.env.LOG_PRETTY === 'true'

    // Configure pino
    const pinoConfig: pino.LoggerOptions = {
      level,
      formatters: {
        level: (label) => {
          return { level: label }
        },
      },
    }

    // Use pretty printing in development
    if (pretty) {
      this.logger = pino({
        ...pinoConfig,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      })
    }
    else {
      this.logger = pino(pinoConfig)
    }

    LoggerService.instance = this
  }

  /**
   * Get the singleton instance of LoggerService
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  /**
   * Get log level from environment variable
   */
  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase()
    const validLevels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace']

    if (envLevel && validLevels.includes(envLevel as LogLevel)) {
      return envLevel as LogLevel
    }

    // Default to 'info' in production, 'debug' in development
    return process.env.NODE_ENV !== 'production' ? 'debug' : 'info'
  }

  /**
   * Get the underlying pino logger instance
   */
  public getLogger(): Logger {
    return this.logger
  }

  /**
   * Create a child logger with additional context
   */
  public child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings)
  }

  /**
   * Log a fatal error (exits the application)
   */
  public fatal(msg: string, ...args: unknown[]): void
  public fatal(obj: object, msg?: string, ...args: unknown[]): void
  public fatal(...args: unknown[]): void {
    // @ts-expect-error - pino handles overloads internally
    this.logger.fatal(...args)
  }

  /**
   * Log an error
   */
  public error(msg: string, ...args: unknown[]): void
  public error(obj: object, msg?: string, ...args: unknown[]): void
  public error(...args: unknown[]): void {
    // @ts-expect-error - pino handles overloads internally
    this.logger.error(...args)
  }

  /**
   * Log a warning
   */
  public warn(msg: string, ...args: unknown[]): void
  public warn(obj: object, msg?: string, ...args: unknown[]): void
  public warn(...args: unknown[]): void {
    // @ts-expect-error - pino handles overloads internally
    this.logger.warn(...args)
  }

  /**
   * Log an info message
   */
  public info(msg: string, ...args: unknown[]): void
  public info(obj: object, msg?: string, ...args: unknown[]): void
  public info(...args: unknown[]): void {
    // @ts-expect-error - pino handles overloads internally
    this.logger.info(...args)
  }

  /**
   * Log a debug message
   */
  public debug(msg: string, ...args: unknown[]): void
  public debug(obj: object, msg?: string, ...args: unknown[]): void
  public debug(...args: unknown[]): void {
    // @ts-expect-error - pino handles overloads internally
    this.logger.debug(...args)
  }

  /**
   * Log a trace message
   */
  public trace(msg: string, ...args: unknown[]): void
  public trace(obj: object, msg?: string, ...args: unknown[]): void
  public trace(...args: unknown[]): void {
    // @ts-expect-error - pino handles overloads internally
    this.logger.trace(...args)
  }

  /**
   * Set the log level dynamically
   */
  public setLevel(level: LogLevel): void {
    this.logger.level = level
  }

  /**
   * Get the current log level
   */
  public getLevel(): string {
    return this.logger.level
  }
}
