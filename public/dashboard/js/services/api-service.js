/**
 * API Service
 * Handles all API calls to the backend
 */

import AuthService from './auth-service.js';

const ApiService = {
  /**
   * Make an authenticated API request
   * @param {string} url - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Promise resolving to API response
   */
  async request(url, options = {}) {
    const token = AuthService.getToken();

    // Set default headers
    const headers = {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    // For POST/PUT requests, set content type if not specified
    if (['POST', 'PUT'].includes(options.method) && !options.headers?.['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle unauthorized (expired token)
      if (response.status === 401) {
        AuthService.logout();
        throw new Error('Session expired. Please login again.');
      }

      // Parse JSON response
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Error: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`API Error (${url}):`, error);
      throw error;
    }
  },

  /**
   * Dashboard API methods
   */
  dashboard: {
    /**
     * Get dashboard statistics
     * @returns {Promise<Object>} Dashboard stats
     */
    async getStatistics() {
      const cacheBuster = new Date().getTime();
      const result = await ApiService.request(`/api/dashboard/statistics?_=${cacheBuster}`, {
        cache: 'no-store',
      });
      return result.data;
    },

    /**
     * Get recent scrapes
     * @param {number} limit - Number of scrapes to fetch
     * @returns {Promise<Array>} Recent scrapes
     */
    async getRecentScrapes(limit = 5) {
      const result = await ApiService.request(`/api/dashboard/recent-scrapes?limit=${limit}`);
      return result.data.scrapes;
    },

    /**
     * Get recent jobs (scrape, crawl, forum)
     * @param {number} limit - Number of jobs to fetch
     * @returns {Promise<Array>} Recent jobs
     */
    async getRecentJobs(limit = 5) {
      const result = await ApiService.request(`/api/dashboard/recent-jobs?limit=${limit}`);
      return result.data.jobs;
    },

    /**
     * Get available tags
     * @returns {Promise<Array>} Tags
     */
    async getTags() {
      const result = await ApiService.request('/api/dashboard/tags');
      return result.data.tags;
    },
  },

  /**
   * Scrapes API methods
   */
  scrapes: {
    /**
     * Get list of scrapes with optional filtering
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Scrapes with pagination
     */
    async getScrapes(params = {}) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.set(key, value);
      });

      const result = await ApiService.request(`/api/dashboard/scrapes?${queryParams.toString()}`);
      return result.data;
    },

    /**
     * Toggle favorite status of a scrape
     * @param {string} id - Scrape ID
     * @param {boolean} isFavorite - Whether to mark as favorite
     * @returns {Promise<Object>} Updated scrape
     */
    async toggleFavorite(id, isFavorite) {
      const result = await ApiService.request(`/api/dashboard/scrape/${id}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ isFavorite }),
      });
      return result.data;
    },

    /**
     * Delete a scrape
     * @param {string} id - Scrape ID
     * @returns {Promise<Object>} Result
     */
    async deleteScrape(id) {
      const result = await ApiService.request(`/api/dashboard/scrape/${id}`, {
        method: 'DELETE',
      });
      return result.data;
    },

    /**
     * Create a new scrape
     * @param {Object} scrapeData - Scrape data
     * @returns {Promise<Object>} Created scrape
     */
    async createScrape(scrapeData) {
      const result = await ApiService.request('/api/scrape', {
        method: 'POST',
        body: JSON.stringify(scrapeData),
      });
      return result.data;
    },
  },

  /**
   * Scrape Jobs API methods
   */
  jobs: {
    /**
     * Get list of scrape jobs
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Jobs with pagination
     */
    async getJobs(params = {}) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.set(key, value);
      });

      const result = await ApiService.request(
        `/api/dashboard/scrape-jobs?${queryParams.toString()}`,
      );
      return result.data;
    },

    /**
     * Retry a failed job
     * @param {string} id - Job ID
     * @returns {Promise<Object>} Result
     */
    async retryJob(id) {
      const result = await ApiService.request(`/api/dashboard/scrape-job/${id}/retry`, {
        method: 'POST',
      });
      return result.data;
    },

    /**
     * Delete a job
     * @param {string} id - Job ID
     * @returns {Promise<Object>} Result
     */
    async deleteJob(id) {
      const result = await ApiService.request(`/api/dashboard/scrape-job/${id}`, {
        method: 'DELETE',
      });
      return result.data;
    },
  },

  /**
   * Crawl Jobs API methods
   */
  crawlJobs: {
    /**
     * Get list of crawl jobs
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Crawl jobs with pagination
     */
    async getCrawlJobs(params = {}) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.set(key, value);
      });

      const result = await ApiService.request(
        `/api/dashboard/crawl-jobs?${queryParams.toString()}`,
      );
      return result.data;
    },

    /**
     * Get details for a specific crawl job
     * @param {string} id - Crawl job ID
     * @returns {Promise<Object>} Crawl job details
     */
    async getCrawlJobDetails(id) {
      const result = await ApiService.request(`/api/crawl/${id}`);
      return result.data;
    },

    /**
     * Delete a crawl job
     * @param {string} id - Crawl job ID
     * @returns {Promise<Object>} Result
     */
    async deleteCrawlJob(id) {
      const result = await ApiService.request(`/api/crawl/${id}`, {
        method: 'DELETE',
      });
      return result.data;
    },

    /**
     * Create a new crawl job
     * @param {Object} crawlData - Crawl data
     * @returns {Promise<Object>} Created crawl job
     */
    async createCrawlJob(crawlData) {
      const result = await ApiService.request('/api/crawl', {
        method: 'POST',
        body: JSON.stringify(crawlData),
      });
      return result.data;
    },

    /**
     * Cancel a crawl job
     * @param {string} id - Crawl job ID
     * @returns {Promise<Object>} Result
     */
    async cancelCrawlJob(id) {
      const result = await ApiService.request(`/api/crawl/${id}/cancel`, {
        method: 'POST',
      });
      return result;
    },
  },

  /**
   * Transformers API methods
   */
  transformers: {
    /**
     * Get available transformers
     * @returns {Promise<Array>} Transformers list
     */
    async getTransformers() {
      const result = await ApiService.request('/api/transform/transformers');
      return result.data;
    },

    /**
     * Apply a transformer
     * @param {string} transformerName - Transformer name
     * @param {Object} data - Data to transform
     * @returns {Promise<Object>} Transformation result
     */
    async applyTransformer(transformerName, data) {
      const result = await ApiService.request(
        `/api/transform/transformers/${encodeURIComponent(transformerName)}/apply`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      return result.data;
    },
  },
};

export default ApiService;
