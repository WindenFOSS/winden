/**
 * @fileoverview Configures and initializes a structured logging system using Winston
 * @module handlers/console
 */

const winston = require('winston');
const { format, transports } = winston;

/**
 * Creates and configures a production-ready Winston logger with standardized formatting
 * @returns {winston.Logger} Configured Winston logger instance with error handling
 */
function createLogger() {
  // Helper function to check if an error should be filtered
  const shouldFilterError = (error) => {
    if (!error) return false;
    const errorString = JSON.stringify(error);
    return errorString.includes("'app' is missing 'framework'");
  };

  // Override console.error to catch native error output
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorString = args.join(' ');
    if (!errorString.includes("'app' is missing 'framework'")) {
      originalConsoleError.apply(console, args);
    }
  };

  // Capture stderr write to filter error messages
  const { write: stdErrWrite } = process.stderr;
  process.stderr.write = function (chunk, encoding, callback) {
    if (typeof chunk === 'string' && !chunk.includes("'app' is missing 'framework'")) {
      stdErrWrite.apply(process.stderr, arguments);
    }
    if (typeof callback === 'function') callback();
  };

  // Define custom format combining timestamp, colors and structured output
  const chalk = require('chalk');

  const customFormat = format.combine(
    format.timestamp({
      format: 'HH:mm:ss'
    }),
    format((info) => {
      if (shouldFilterError(info) || 
          shouldFilterError(info.message) || 
          shouldFilterError(info.stack) ||
          (info.error && shouldFilterError(info.error))) {
        return false;
      }
      return info;
    })(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    format.colorize(),
    format.printf(({ level, message, timestamp, ...metadata }) => {
      let msg = `${chalk.hex('#a8a8a8')(timestamp)}${chalk.dim(' ▏')} ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
      return msg;
    })
  );

  // Initialize logger with production-ready configuration
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports: [
      new transports.Console({
        handleExceptions: true,
        handleRejections: true,
        format: customFormat
      }),
      new transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ],
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true,
    silent: false
  });

  // Override the default exception handlers
  logger.exceptions.handle = function(error) {
    if (shouldFilterError(error)) return;
    return true;
  };

  logger.rejections.handle = function(error) {
    if (shouldFilterError(error)) return;
    return true;
  };

  // Add custom error handler for the process
  const errorHandler = (error) => {
    if (!shouldFilterError(error)) {
      logger.error('Error:', error);
    }
  };

  process.on('uncaughtException', errorHandler);
  process.on('unhandledRejection', errorHandler);

  // Intercept console.log calls and redirect to Winston
  const originalConsole = console.log;
  console.log = (...args) => {
    const message = args
      .map(arg => typeof arg === 'object' ? 
        JSON.stringify(arg, null, 2) : 
        String(arg))
      .join(' ');
    logger.info(message);
  };

  return logger;
}

module.exports = createLogger;