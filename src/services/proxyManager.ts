import { createHttpClient } from '../utils/httpClient.js'; // Remove HttpClientConfig
import logger from '../utils/logger.js';

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  active: boolean;
  lastUsed?: Date;
  successCount: number;
  failCount: number;
}

/**
 * Proxy manager for handling multiple proxies
 */
export class ProxyManager {
  private proxies: ProxyConfig[] = [];

  /**
   * Add a proxy to the pool
   *
   * @param proxy - Proxy configuration
   */
  addProxy(proxy: Omit<ProxyConfig, 'active' | 'successCount' | 'failCount'>): void {
    this.proxies.push({
      ...proxy,
      active: true,
      successCount: 0,
      failCount: 0,
    });

    logger.info({
      message: 'Added proxy to pool',
      host: proxy.host,
      port: proxy.port,
    });
  }

  /**
   * Get a proxy from the pool
   *
   * @returns Proxy configuration or undefined if none available
   */
  getProxy(): ProxyConfig | undefined {
    // Filter active proxies
    const activeProxies = this.proxies.filter(p => p.active);
    if (activeProxies.length === 0) return undefined;

    // Sort by least recently used
    activeProxies.sort((a, b) => {
      if (!a.lastUsed) return -1;
      if (!b.lastUsed) return 1;
      return a.lastUsed.getTime() - b.lastUsed.getTime();
    });

    // Get the proxy and update last used
    const proxy = activeProxies[0];
    proxy.lastUsed = new Date();

    logger.debug({
      message: 'Using proxy',
      host: proxy.host,
      port: proxy.port,
    });

    return proxy;
  }

  /**
   * Create an HTTP client with a proxy
   *
   * @param config - Additional HTTP client configuration (type inferred)
   * @returns HTTP client with proxy
   */
  createProxiedClient(config: any = {}): ReturnType<typeof createHttpClient> {
    // Use any for config type for simplicity
    const proxy = this.getProxy();

    if (!proxy) {
      logger.warn('No proxies available, creating client without proxy');
      return createHttpClient(config);
    }

    // Pass proxy details directly, not nested under 'proxy'
    return createHttpClient({
      ...config,
      proxyHost: proxy.host,
      proxyPort: proxy.port,
      proxyAuth: proxy.auth,
    });
  }

  /**
   * Report proxy success
   *
   * @param host - Proxy host
   * @param port - Proxy port
   */
  reportSuccess(host: string, port: number): void {
    const proxy = this.findProxy(host, port);
    if (proxy) {
      proxy.successCount++;
      logger.debug({
        message: 'Proxy success reported',
        host,
        port,
        successCount: proxy.successCount,
      });
    }
  }

  /**
   * Report proxy failure
   *
   * @param host - Proxy host
   * @param port - Proxy port
   */
  reportFailure(host: string, port: number): void {
    const proxy = this.findProxy(host, port);
    if (proxy) {
      proxy.failCount++;

      // Deactivate proxy if it fails too many times
      if (proxy.failCount >= 5 && proxy.successCount / proxy.failCount < 0.5) {
        proxy.active = false;
        logger.warn({
          message: 'Proxy deactivated due to failures',
          host,
          port,
          failCount: proxy.failCount,
          successCount: proxy.successCount,
        });
      } else {
        logger.debug({
          message: 'Proxy failure reported',
          host,
          port,
          failCount: proxy.failCount,
        });
      }
    }
  }

  /**
   * Reactivate a deactivated proxy
   *
   * @param host - Proxy host
   * @param port - Proxy port
   */
  reactivateProxy(host: string, port: number): void {
    const proxy = this.findProxy(host, port);
    if (proxy && !proxy.active) {
      proxy.active = true;
      proxy.failCount = 0;
      logger.info({
        message: 'Proxy reactivated',
        host,
        port,
      });
    }
  }

  /**
   * Get all proxies
   *
   * @returns Array of proxy configurations
   */
  getAllProxies(): ProxyConfig[] {
    return [...this.proxies];
  }

  /**
   * Find a proxy by host and port
   *
   * @param host - Proxy host
   * @param port - Proxy port
   * @returns Proxy configuration or undefined if not found
   */
  private findProxy(host: string, port: number): ProxyConfig | undefined {
    return this.proxies.find(p => p.host === host && p.port === port);
  }
}

// Create and export a singleton instance
export const proxyManager = new ProxyManager();
