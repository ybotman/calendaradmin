// error-handler.js
// Error handling and logging utilities for BTC import

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ERROR_LOG_DIR = process.env.ERROR_LOG_DIR || path.join(__dirname, 'logs');
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'import-errors.log');
const ERROR_DETAILS_DIR = path.join(ERROR_LOG_DIR, 'error-details');

// Create directories if they don't exist
if (!fs.existsSync(ERROR_LOG_DIR)) {
  fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
}
if (!fs.existsSync(ERROR_DETAILS_DIR)) {
  fs.mkdirSync(ERROR_DETAILS_DIR, { recursive: true });
}

/**
 * Error categories
 */
export const ErrorCategory = {
  API_ACCESS: 'API_ACCESS',
  ENTITY_RESOLUTION: 'ENTITY_RESOLUTION',
  DATA_VALIDATION: 'DATA_VALIDATION',
  PROCESSING: 'PROCESSING',
  SYSTEM: 'SYSTEM'
};

/**
 * Error severities
 */
export const ErrorSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
};

/**
 * Import stages
 */
export const ImportStage = {
  INITIALIZATION: 'INITIALIZATION',
  EXTRACTION: 'EXTRACTION',
  TRANSFORMATION: 'TRANSFORMATION',
  ENTITY_RESOLUTION: 'ENTITY_RESOLUTION',
  VALIDATION: 'VALIDATION',
  LOADING: 'LOADING',
  VERIFICATION: 'VERIFICATION',
  CLEANUP: 'CLEANUP'
};

/**
 * Generate a unique error ID
 * @returns {string} Unique error ID
 */
function generateErrorId() {
  return `ERR-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
}

/**
 * Custom error class for BTC import errors
 */
export class ImportError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} category - Error category
   * @param {string} severity - Error severity
   * @param {string} stage - Import stage where error occurred
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   */
  constructor(message, category, severity, stage, context = {}, originalError = null) {
    super(message);
    this.name = 'ImportError';
    this.category = category || ErrorCategory.SYSTEM;
    this.severity = severity || ErrorSeverity.ERROR;
    this.stage = stage || ImportStage.INITIALIZATION;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    this.id = generateErrorId();
  }
  
  /**
   * Convert error to JSON representation
   * @returns {Object} JSON representation of error
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      stage: this.stage,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null
    };
  }
}

/**
 * Error logger
 */
export class ErrorLogger {
  /**
   * Log an error
   * @param {ImportError} error - Error to log
   */
  static logError(error) {
    // Create log entry
    const entry = {
      timestamp: new Date().toISOString(),
      error: error.toJSON()
    };
    
    // Write to main log file
    const logLine = `[${entry.timestamp}] [${error.id}] [${error.severity}] [${error.category}] [${error.stage}] ${error.message}\n`;
    fs.appendFileSync(ERROR_LOG_FILE, logLine);
    
    // Write detailed error to separate file
    const detailsFile = path.join(ERROR_DETAILS_DIR, `${error.id}.json`);
    fs.writeFileSync(detailsFile, JSON.stringify(entry, null, 2));
    
    // Console output for immediate visibility
    if (error.severity === ErrorSeverity.ERROR || error.severity === ErrorSeverity.FATAL) {
      console.error(`[${error.severity}] ${error.message} (ID: ${error.id})`);
    } else if (error.severity === ErrorSeverity.WARNING) {
      console.warn(`[${error.severity}] ${error.message} (ID: ${error.id})`);
    } else {
      console.info(`[${error.severity}] ${error.message} (ID: ${error.id})`);
    }
    
    return error.id;
  }
  
  /**
   * Create and log an error
   * @param {string} message - Error message
   * @param {string} category - Error category
   * @param {string} severity - Error severity
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   * @returns {string} Error ID
   */
  static createAndLogError(message, category, severity, stage, context = {}, originalError = null) {
    const error = new ImportError(message, category, severity, stage, context, originalError);
    return ErrorLogger.logError(error);
  }
  
  /**
   * Create and log an API access error
   * @param {string} message - Error message
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   * @returns {string} Error ID
   */
  static logApiError(message, stage, context = {}, originalError = null) {
    return ErrorLogger.createAndLogError(
      message,
      ErrorCategory.API_ACCESS,
      ErrorSeverity.ERROR,
      stage,
      context,
      originalError
    );
  }
  
  /**
   * Create and log an entity resolution error
   * @param {string} message - Error message
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   * @returns {string} Error ID
   */
  static logEntityError(message, stage, context = {}, originalError = null) {
    return ErrorLogger.createAndLogError(
      message,
      ErrorCategory.ENTITY_RESOLUTION,
      ErrorSeverity.WARNING,
      stage,
      context,
      originalError
    );
  }
  
  /**
   * Create and log a data validation error
   * @param {string} message - Error message
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   * @returns {string} Error ID
   */
  static logValidationError(message, stage, context = {}, originalError = null) {
    return ErrorLogger.createAndLogError(
      message,
      ErrorCategory.DATA_VALIDATION,
      ErrorSeverity.WARNING,
      stage,
      context,
      originalError
    );
  }
  
  /**
   * Create and log a processing error
   * @param {string} message - Error message
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   * @returns {string} Error ID
   */
  static logProcessingError(message, stage, context = {}, originalError = null) {
    return ErrorLogger.createAndLogError(
      message,
      ErrorCategory.PROCESSING,
      ErrorSeverity.ERROR,
      stage,
      context,
      originalError
    );
  }
  
  /**
   * Create and log a system error
   * @param {string} message - Error message
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @param {Error} originalError - Original error (if wrapping)
   * @returns {string} Error ID
   */
  static logSystemError(message, stage, context = {}, originalError = null) {
    return ErrorLogger.createAndLogError(
      message,
      ErrorCategory.SYSTEM,
      ErrorSeverity.FATAL,
      stage,
      context,
      originalError
    );
  }
  
  /**
   * Log an info message
   * @param {string} message - Info message
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @returns {string} Error ID
   */
  static logInfo(message, stage, context = {}) {
    return ErrorLogger.createAndLogError(
      message,
      ErrorCategory.PROCESSING,
      ErrorSeverity.INFO,
      stage,
      context
    );
  }
  
  /**
   * Get error statistics by category, severity, and stage
   * @returns {Object} Error statistics
   */
  static getErrorStats() {
    // Read and parse error log
    if (!fs.existsSync(ERROR_LOG_FILE)) {
      return {
        totalErrors: 0,
        byCategory: {},
        bySeverity: {},
        byStage: {}
      };
    }
    
    const logContent = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    const stats = {
      totalErrors: logLines.length,
      byCategory: {},
      bySeverity: {},
      byStage: {}
    };
    
    // Parse log lines to build statistics
    const regex = /\[.*?\] \[(ERR-.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\]/;
    
    logLines.forEach(line => {
      const match = line.match(regex);
      if (match) {
        const [, , severity, category, stage] = match;
        
        // Count by category
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        // Count by severity
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        
        // Count by stage
        stats.byStage[stage] = (stats.byStage[stage] || 0) + 1;
      }
    });
    
    return stats;
  }
}

/**
 * API error handler with optimized retry capabilities
 */
export class ApiErrorHandler {
  /**
   * Constructor
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} initialDelay - Initial delay in milliseconds
   * @param {number} maxDelay - Maximum delay in milliseconds
   */
  constructor(maxRetries = 3, initialDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
  }
  
  /**
   * Execute an API call with optimized retry logic
   * @param {Function} apiCall - API call function to execute
   * @param {string} stage - Import stage
   * @param {Object} context - Additional context
   * @returns {Promise<any>} API call result
   */
  async executeWithRetry(apiCall, stage, context = {}) {
    let retries = 0;
    let delay = this.initialDelay;
    let lastError = null;
    
    // Track the specific types of errors for better diagnosis
    const errorTracker = {
      networkErrors: 0,
      authErrors: 0,
      serverErrors: 0,
      clientErrors: 0,
      unknownErrors: 0,
      lastErrorTimestamp: null
    };
    
    // Max number of specific error types before giving up
    const MAX_AUTH_ERRORS = 1; // Auth errors are unlikely to be resolved with retries
    const MAX_SERVER_ERRORS = 2; // Only retry server errors twice
    
    while (retries <= this.maxRetries) {
      try {
        // Add retry count to context if this isn't the first attempt
        const attemptContext = retries > 0 ? 
          { ...context, attemptNumber: retries, previousErrors: errorTracker } : 
          context;
        
        // Execute the API call
        return await apiCall();
        
      } catch (error) {
        lastError = error;
        errorTracker.lastErrorTimestamp = new Date().toISOString();
        
        // Handle specific error cases
        let shouldRetry = false;
        let errorMessage = '';
        let errorType = 'unknown';
        
        if (error.response) {
          // Server responded with error status
          const { status, data } = error.response;
          
          if (status === 429) {
            // Rate limit exceeded - retry with appropriate delays
            shouldRetry = retries < this.maxRetries;
            errorType = 'rateLimit';
            errorMessage = `Rate limit exceeded (429): ${JSON.stringify(data)}`;
            
            // Use Retry-After header if available, but cap at maxDelay
            const retryAfter = error.response.headers['retry-after'];
            if (retryAfter) {
              delay = Math.min(parseInt(retryAfter, 10) * 1000, this.maxDelay); 
            } else {
              // If no Retry-After header, use a modest delay
              delay = Math.min(delay * 2, this.maxDelay);
            }
            
          } else if (status >= 500) {
            // Server error - limited retries with standard backoff
            errorType = 'server';
            errorTracker.serverErrors++;
            shouldRetry = errorTracker.serverErrors <= MAX_SERVER_ERRORS;
            errorMessage = `Server error (${status}): ${JSON.stringify(data)}`;
            
          } else if (status === 401 || status === 403) {
            // Authentication/authorization error - very limited retries
            errorType = 'auth';
            errorTracker.authErrors++;
            
            // Only retry auth errors once - they're unlikely to resolve without intervention
            shouldRetry = errorTracker.authErrors <= MAX_AUTH_ERRORS;
            errorMessage = `Authentication error (${status}): ${JSON.stringify(data)}`;
            
          } else if (status === 404) {
            // Not Found errors - don't retry for 404s, it's probably a real missing resource
            errorType = 'notFound';
            shouldRetry = false;
            errorMessage = `Resource not found (404): ${JSON.stringify(data)}`;
            
          } else {
            // Other client errors - very limited retry based on specific status codes
            errorType = 'client';
            errorTracker.clientErrors++;
            
            // Only retry certain 4xx errors that might be transient
            const retryableClientErrors = [408, 425, 449, 503]; // Request Timeout, Too Early, Retry With, Service Unavailable
            shouldRetry = retryableClientErrors.includes(status) && errorTracker.clientErrors <= 1;
            errorMessage = `API client error (${status}): ${JSON.stringify(data)}`;
          }
          
        } else if (error.request) {
          // No response received - likely network issues, retry with limits
          errorType = 'network';
          errorTracker.networkErrors++;
          shouldRetry = errorTracker.networkErrors <= this.maxRetries;
          errorMessage = 'No response received from server (network issue)';
          
        } else {
          // Request setup error - only retry for known transient issues
          errorType = 'setup';
          errorTracker.unknownErrors++;
          
          // Only retry for specific transient error patterns
          const transientErrorPatterns = [
            'timeout', 'timed out', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'socket hang up'
          ];
          
          shouldRetry = transientErrorPatterns.some(pattern => 
            error.message.toLowerCase().includes(pattern.toLowerCase())
          ) && errorTracker.unknownErrors <= 1;
          
          errorMessage = `Request setup error: ${error.message}`;
        }
        
        // Check if we should retry
        if (!shouldRetry || retries >= this.maxRetries) {
          // Create a combined error summary for the final error log
          const errorSummary = {
            attempts: retries + 1,
            errorsByType: errorTracker,
            finalErrorType: errorType,
            finalErrorStatus: error.response?.status,
            finalErrorMessage: errorMessage
          };
          
          // Log the final failure with detailed information
          ErrorLogger.logApiError(
            `API call failed after ${retries} attempts: ${errorMessage}`,
            stage,
            { ...context, ...errorSummary },
            error
          );
          
          // Add error summary to the error object before throwing
          if (error.response) {
            error.response.errorSummary = errorSummary;
          }
          
          // For certain error types, add more specific information to help troubleshooting
          if (errorType === 'auth') {
            console.error(`Authentication error details: Check token validity or permissions for endpoint`);
            
            // Try to get auth header info (without exposing full token)
            const authHeader = error.config?.headers?.Authorization;
            if (authHeader) {
              const tokenFormat = authHeader.startsWith('Bearer ') ? 'Bearer token' : 'Other auth type';
              const tokenLength = authHeader.length;
              console.error(`Auth header format: ${tokenFormat}, length: ${tokenLength}`);
            }
          }
          
          throw error;
        }
        
        // Log the error with retry information
        console.log(`API error (${errorType}). Retrying in ${delay/1000} seconds... (attempt ${retries + 1}/${this.maxRetries})`);
        
        ErrorLogger.logApiError(
          `${errorMessage}. Retrying (${retries + 1}/${this.maxRetries})...`,
          stage,
          { 
            ...context, 
            retries, 
            delay, 
            errorType,
            errorTracker,
            nextRetryIn: `${delay}ms`
          },
          error
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next retry (exponential backoff with some jitter for distributed systems)
        const jitter = Math.random() * 0.3 + 0.85; // Random multiplier between 0.85 and 1.15
        delay = Math.min(delay * 1.5 * jitter, this.maxDelay);
        retries++;
      }
    }
    
    // Should never reach here, but as a fallback
    throw lastError || new Error('Maximum retries reached with no specific error captured');
  }
}

export default {
  ErrorCategory,
  ErrorSeverity,
  ImportStage,
  ImportError,
  ErrorLogger,
  ApiErrorHandler
};