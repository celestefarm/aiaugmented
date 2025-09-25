/**
 * Comprehensive Error Handling System
 * 
 * This module provides centralized error handling, retry mechanisms,
 * and user-friendly error messages for the application.
 */

// Error types and interfaces
export interface ApiErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export interface ErrorHandlerOptions {
  context?: string;
  operation?: string;
  showUserMessage?: boolean;
  retryConfig?: Partial<RetryConfig>;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

// Error classification system
export class ApiErrorClassifier {
  static classify(error: Error | unknown, context?: string): ApiErrorDetails {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Network connection failed. Please check your internet connection and try again.',
        retryable: true,
        severity: 'high',
        context: { originalError: error.message, context }
      };
    }

    // HTTP errors
    if (error && typeof error === 'object' && 'message' in error && typeof (error as Error).message === 'string') {
      const message = (error as Error).message;

      // Authentication errors - handle both 401 and 403 with "Not authenticated"
      if (message.includes('401') || message.includes('Unauthorized') ||
          (message.includes('403') && message.includes('Not authenticated'))) {
        return {
          code: 'AUTH_ERROR',
          message,
          userMessage: 'Your session has expired. Please log in again.',
          retryable: false,
          severity: 'critical',
          context: { context }
        };
      }

      // Permission errors (403 but not "Not authenticated")
      if (message.includes('403') || message.includes('Forbidden') || message.includes('Access denied')) {
        return {
          code: 'PERMISSION_ERROR',
          message,
          userMessage: 'You don\'t have permission to perform this action.',
          retryable: false,
          severity: 'medium',
          context: { context }
        };
      }

      // Not found errors - Enhanced for node deletion context
      if (message.includes('404') || message.includes('Not found')) {
        // Special handling for node deletion 404s - these are often expected
        let userMessage = 'The requested resource was not found.';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        
        if (context === 'MapContext' && message.includes('Node not found')) {
          userMessage = 'Node has already been deleted or does not exist.';
          severity = 'low'; // Lower severity for expected node deletion scenarios
        }
        
        return {
          code: 'NOT_FOUND_ERROR',
          message,
          userMessage,
          retryable: false, // 404s should never be retried
          severity,
          context: { context, isNodeDeletion: context === 'MapContext' }
        };
      }

      // Rate limiting
      if (message.includes('429') || message.includes('Too Many Requests')) {
        return {
          code: 'RATE_LIMIT_ERROR',
          message,
          userMessage: 'Too many requests. Please wait a moment and try again.',
          retryable: true,
          severity: 'medium',
          context: { context }
        };
      }

      // Server errors
      if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
        return {
          code: 'SERVER_ERROR',
          message,
          userMessage: 'Server error occurred. Please try again in a few moments.',
          retryable: true,
          severity: 'high',
          context: { context }
        };
      }

      // Bad request errors (400) - typically validation or business logic errors
      if (message.includes('400') || message.includes('Bad Request')) {
        return {
          code: 'BAD_REQUEST_ERROR',
          message,
          userMessage: message.includes('already been added') ? 'This item has already been added.' : 'Invalid request. Please check your input and try again.',
          retryable: false,
          severity: 'low',
          context: { context }
        };
      }

      // Validation errors
      if (message.includes('422') || message.includes('validation') || message.includes('invalid')) {
        return {
          code: 'VALIDATION_ERROR',
          message,
          userMessage: 'Invalid data provided. Please check your input and try again.',
          retryable: false,
          severity: 'low',
          context: { context }
        };
      }

      // Timeout errors
      if (message.includes('timeout') || message.includes('408')) {
        return {
          code: 'TIMEOUT_ERROR',
          message,
          userMessage: 'Request timed out. Please try again.',
          retryable: true,
          severity: 'medium',
          context: { context }
        };
      }
    }

    // Generic error fallback
    const errorMessage = error && typeof error === 'object' && 'message' in error
      ? (error as Error).message
      : 'Unknown error occurred';
    
    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      severity: 'medium',
      context: { originalError: error, context }
    };
  }
}

// Retry mechanism with exponential backoff
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context?: string
  ): Promise<T> {
    let lastError: Error | unknown;
    let delay = config.baseDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`🔄 [RetryHandler] Attempt ${attempt + 1}/${config.maxRetries + 1} for ${context || 'operation'}`);
        return await operation();
      } catch (error) {
        lastError = error;
        
        const errorDetails = ApiErrorClassifier.classify(error, context);
        console.error(`❌ [RetryHandler] Attempt ${attempt + 1} failed:`, errorDetails);

        // Don't retry if error is not retryable
        if (!errorDetails.retryable) {
          console.log(`🚫 [RetryHandler] Error not retryable, stopping attempts`);
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === config.maxRetries) {
          console.log(`🚫 [RetryHandler] Max retries reached, giving up`);
          break;
        }

        // Wait before next attempt
        console.log(`⏳ [RetryHandler] Waiting ${delay}ms before next attempt`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff with jitter
        delay = Math.min(
          delay * config.backoffMultiplier + Math.random() * 1000,
          config.maxDelay
        );
      }
    }

    throw lastError;
  }
}

// Error boundary helper
export class ErrorBoundaryHandler {
  static handleError(error: Error, errorInfo: Record<string, unknown>, context?: string): void {
    const errorDetails = ApiErrorClassifier.classify(error, context);
    
    console.error('🚨 [ErrorBoundary] Component error caught:', {
      error: errorDetails,
      errorInfo,
      context,
      stack: error.stack
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.log('📊 [ErrorBoundary] Would send to error tracking service in production');
    }
  }
}

// Context-aware error handler
export class ContextualErrorHandler {
  private context: string;
  private defaultRetryConfig: RetryConfig;

  constructor(context: string, retryConfig?: Partial<RetryConfig>) {
    this.context = context;
    this.defaultRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async handleOperation<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T> {
    const context = options.context || this.context;
    const retryConfig = { ...this.defaultRetryConfig, ...options.retryConfig };

    try {
      return await RetryHandler.withRetry(operation, retryConfig, context);
    } catch (error) {
      const errorDetails = ApiErrorClassifier.classify(error, context);
      
      console.error(`❌ [${context}] Operation failed:`, {
        operation: options.operation,
        error: errorDetails,
        retryConfig
      });

      // Handle specific error types
      if (errorDetails.code === 'AUTH_ERROR') {
        this.handleAuthError(errorDetails);
      }

      // Re-throw with enhanced error information
      const enhancedError = new Error(errorDetails.userMessage);
      (enhancedError as Error & { details?: ApiErrorDetails; context?: string; operation?: string }).details = errorDetails;
      (enhancedError as Error & { details?: ApiErrorDetails; context?: string; operation?: string }).context = context;
      (enhancedError as Error & { details?: ApiErrorDetails; context?: string; operation?: string }).operation = options.operation;
      
      throw enhancedError;
    }
  }

  private handleAuthError(errorDetails: ApiErrorDetails): void {
    console.log('🔐 [ContextualErrorHandler] Handling authentication error');
    
    // Clear authentication state
    localStorage.removeItem('auth_token');
    
    // Trigger page reload to force re-authentication
    if (typeof window !== 'undefined') {
      console.log('🔄 [ContextualErrorHandler] Reloading page for re-authentication');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
}

// Error state management hook helper
export interface ErrorState {
  error: string | null;
  errorDetails: ApiErrorDetails | null;
  isRetrying: boolean;
  retryCount: number;
}

export class ErrorStateManager {
  static createInitialState(): ErrorState {
    return {
      error: null,
      errorDetails: null,
      isRetrying: false,
      retryCount: 0
    };
  }

  static setError(error: Error | unknown, context?: string): ErrorState {
    const errorDetails = ApiErrorClassifier.classify(error, context);
    return {
      error: errorDetails.userMessage,
      errorDetails,
      isRetrying: false,
      retryCount: 0
    };
  }

  static setRetrying(retryCount: number): ErrorState {
    return {
      error: null,
      errorDetails: null,
      isRetrying: true,
      retryCount
    };
  }

  static clearError(): ErrorState {
    return {
      error: null,
      errorDetails: null,
      isRetrying: false,
      retryCount: 0
    };
  }
}

// Export convenience functions
export const createErrorHandler = (context: string, retryConfig?: Partial<RetryConfig>) => 
  new ContextualErrorHandler(context, retryConfig);

export const classifyError = (error: Error | unknown, context?: string) =>
  ApiErrorClassifier.classify(error, context);

export const withRetry = <T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  context?: string
) => RetryHandler.withRetry(operation, { ...DEFAULT_RETRY_CONFIG, ...config }, context);