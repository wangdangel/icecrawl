import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'webscraper' },
  transports: [
    // Write to all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Determine if the current process is running the CLI entry point
const scriptPath = process.argv[1]; // Get the path of the executed script
const isCliProcess = scriptPath && (scriptPath.endsWith('cli.ts') || scriptPath.endsWith('cli.js'));

// If we're not in production AND it's not the CLI process, log to the console with JSON format
if (process.env.NODE_ENV !== 'production' && !isCliProcess) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(), // Add timestamp to console
      winston.format.errors({ stack: true }), // Ensure errors are logged properly
      winston.format.json() // Use JSON format for console as well
    ),
  }));
}

export default logger;
