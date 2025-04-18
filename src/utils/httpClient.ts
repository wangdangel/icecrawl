import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import logger from './logger';

/**
 * Creates a configured HTTP client with retry and timeout handling
 *
 * @param config - Configuration options
 * @returns Configured Axios instance
 */
export function createHttpClient(
  config: {
    retries?: number;
    timeout?: number;
    userAgent?: string;
  } = {},
): AxiosInstance {
  const {
    retries = 3,
    timeout = 10000,
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  } = config;

  // Create axios instance
  const client = axios.create({
    timeout,
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  // Configure retry logic
  axiosRetry(client, {
    retries,
    retryDelay: retryCount => retryCount * 1000, // exponential backoff
    retryCondition: (error): boolean => {
      // Explicitly type return as boolean
      // Retry on network errors, timeouts, 429 (too many requests), and 5xx responses
      return !!(
        // Use double negation to ensure boolean return type
        (
          axiosRetry.isNetworkError(error) ||
          error.code === 'ECONNABORTED' || // Timeout
          error.response?.status === 429 ||
          (error.response?.status && error.response.status >= 500)
        )
      );
    },
    onRetry: (retryCount, error, requestConfig) => {
      logger.warn({
        message: `Retrying request (${retryCount}/${retries})`,
        url: requestConfig.url,
        error: error.message,
        timeout: requestConfig.timeout,
      });
    },
  });

  // Add response time logging
  client.interceptors.request.use(config => {
    config.headers = config.headers || {};
    config.headers['request-startTime'] = Date.now().toString();
    return config;
  });

  client.interceptors.response.use(response => {
    const startTime = parseInt((response.config.headers?.['request-startTime'] as string) || '0');
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.debug({
      message: 'Request completed',
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration: `${duration}ms`,
    });

    return response;
  });

  return client;
}

// Export a default client
export const httpClient = createHttpClient();
