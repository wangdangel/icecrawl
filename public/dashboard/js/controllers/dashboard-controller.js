/**
 * Dashboard Controller
 * Handles dashboard page functionality
 */

import ApiService from '../services/api-service.js';
import { createActivityChart } from '../components/charts.js';
import { formatRelativeDate } from '../utils/helpers.js';

class DashboardController {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize dashboard controller
   */
  async init() {
    if (this.initialized) {
      // Just refresh data if already initialized
      await this.loadDashboardStats();
      await this.loadRecentJobs();
      return;
    }

    console.log('Initializing dashboard controller');

    // Load initial data
    try {
      await Promise.all([this.loadDashboardStats(), this.loadRecentJobs()]);

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  /**
   * Load dashboard statistics
   */
  async loadDashboardStats() {
    console.log('Loading dashboard statistics');

    try {
      const stats = await ApiService.dashboard.getStatistics();

      // Update statistics counters
      document.getElementById('stat-total-scrapes').textContent = Number(stats.totalScrapes || 0);
      document.getElementById('stat-favorites').textContent = Number(stats.totalFavorites || 0);

      // Calculate pending and failed jobs totals
      const pendingJobs =
        (Number(stats.scrapeJobStats?.pending) || 0) + (Number(stats.crawlJobStats?.pending) || 0);

      const failedJobs =
        (Number(stats.scrapeJobStats?.failed) || 0) + (Number(stats.crawlJobStats?.failed) || 0);

      document.getElementById('stat-pending-jobs').textContent = pendingJobs;
      document.getElementById('stat-failed-jobs').textContent = failedJobs;

      // Create activity chart if data available
      if (Array.isArray(stats.scrapesByDay) && stats.scrapesByDay.length > 0) {
        createActivityChart(stats.scrapesByDay);
      } else {
        // Create empty chart if no data
        createActivityChart([]);
        console.warn('No scrapesByDay data available for chart');
      }

      // Render top domains
      if (Array.isArray(stats.topDomains)) {
        this.renderTopDomains(stats.topDomains);
      } else {
        console.warn('No topDomains data available');
      }

      console.log('Successfully loaded dashboard stats');
    } catch (error) {
      console.error('Error loading dashboard statistics:', error);
    }
  }

  /**
   * Load recent jobs
   */
  async loadRecentJobs() {
    try {
      const jobs = await ApiService.dashboard.getRecentJobs(5);
      this.renderRecentJobs(jobs);
    } catch (error) {
      console.error('Error loading recent jobs:', error);
    }
  }

  /**
   * Render top domains table
   * @param {Array} domains - Domains data
   */
  renderTopDomains(domains) {
    const topDomainsTable = document.getElementById('top-domains-table');

    if (!topDomainsTable) {
      console.error('Top domains table element not found');
      return;
    }

    topDomainsTable.innerHTML = '';

    if (domains.length === 0) {
      topDomainsTable.innerHTML = `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="2">
            No data available
          </td>
        </tr>`;
      return;
    }

    domains.forEach(domain => {
      topDomainsTable.innerHTML += `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
            ${domain.domain}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${domain.count}
          </td>
        </tr>`;
    });
  }

  /**
   * Render recent jobs table (shows recent scrape, crawl, and forum jobs)
   * @param {Array} jobs - Jobs data
   */
  renderRecentJobs(jobs) {
    const table = document.getElementById('recent-jobs-table');
    if (!table) {
      console.error('Recent jobs table element not found');
      return;
    }
    table.innerHTML = '';
    if (jobs.length === 0) {
      table.innerHTML = `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="3">
            No recent jobs found
          </td>
        </tr>`;
      return;
    }
    jobs.forEach(job => {
      table.innerHTML += `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
            ${job.title || job.startUrl || 'Untitled'}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${job.type || 'unknown'}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${formatRelativeDate(job.createdAt)}
          </td>
        </tr>`;
    });
  }
}

export default DashboardController;
