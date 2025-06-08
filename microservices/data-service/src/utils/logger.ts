// ===============================================
// LOGGER UTILITY - DATA SERVICE
// ===============================================

import winston from 'winston';

export class Logger {
  private logger: winston.Logger;
  private service: string;

  constructor(service: string) {
    this.service = service;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: this.service },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      ],
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, { ...meta, timestamp: new Date().toISOString() });
  }
}

