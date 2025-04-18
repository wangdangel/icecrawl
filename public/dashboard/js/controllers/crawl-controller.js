/**
 * Crawl Controller
 * Handles the Crawl Jobs page functionality
 */

import ApiService from '../services/api-service.js';
import {
  truncateUrl,
  formatDate,
  getStatusClass,
  escapeHtml,
  buildCrawlTree,
  renderCrawlTree,
} from '../utils/helpers.js';

class CrawlController {
  constructor() {
    this.state = {
      jobs: [],
      page: 1,
      limit: 10,
      total: 0,
      status: '',
    };
    this.elements = {};
    this.initialized = false;
  }

  /**
   * Initialize crawl controller
   */
  async init() {
    if (!this.initialized) {
      this.cacheElements();
      this.bindEvents();
      this.initialized = true;
    }

    await this.loadCrawlJobs();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      crawlJobsTable: document.getElementById('crawl-jobs-table'),
      paginationPrev: document.getElementById('crawl-jobs-pagination-prev'),
      paginationNext: document.getElementById('crawl-jobs-pagination-next'),
      paginationCurrent: document.getElementById('crawl-jobs-pagination-current'),
      paginationShowing: document.getElementById('crawl-jobs-pagination-showing'),
      paginationTotal: document.getElementById('crawl-jobs-pagination-total'),
      statusFilter: document.getElementById('crawl-status-filter'),
    };
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Status filter change
    if (this.elements.statusFilter) {
      this.elements.statusFilter.addEventListener('change', () => {
        this.state.status = this.elements.statusFilter.value;
        this.state.page = 1;
        this.loadCrawlJobs();
      });
    }

    // Pagination
    if (this.elements.paginationPrev) {
      this.elements.paginationPrev.addEventListener('click', () => {
        if (this.state.page > 1) {
          this.state.page--;
          this.loadCrawlJobs();
        }
      });
    }

    if (this.elements.paginationNext) {
      this.elements.paginationNext.addEventListener('click', () => {
        if (this.state.page < Math.ceil(this.state.total / this.state.limit)) {
          this.state.page++;
          this.loadCrawlJobs();
        }
      });
    }
  }

  /**
   * Load crawl jobs data
   */
  async loadCrawlJobs() {
    try {
      const params = {
        page: this.state.page,
        limit: this.state.limit,
        status: this.state.status,
      };

      const result = await ApiService.crawlJobs.getCrawlJobs(params);

      this.state.jobs = result.jobs || [];
      this.state.total = result.pagination.total || 0;

      this.renderCrawlJobsTable();
      this.renderPagination();
    } catch (error) {
      console.error('Error loading crawl jobs:', error);

      // Special handling for 404 (API not implemented yet)
      if (error.message.includes('404')) {
        if (this.elements.crawlJobsTable) {
          this.elements.crawlJobsTable.innerHTML = `
            <tr>
              <td colspan="6" class="text-center py-4">
                Feature under development. API endpoint not found.
              </td>
            </tr>`;
        }
        return;
      }

      if (this.elements.crawlJobsTable) {
        this.elements.crawlJobsTable.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-red-600">
              Error loading crawl jobs: ${error.message}
            </td>
          </tr>`;
      }
    }
  }

  /**
   * Render crawl jobs table
   */
  renderCrawlJobsTable() {
    if (!this.elements.crawlJobsTable) {
      console.error('Crawl jobs table element not found');
      return;
    }

    this.elements.crawlJobsTable.innerHTML = '';

    if (this.state.jobs.length === 0) {
      this.elements.crawlJobsTable.innerHTML = `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="6">
            No crawl jobs found
          </td>
        </tr>`;
      return;
    }

    this.state.jobs.forEach(job => {
      const statusClass = getStatusClass(job.status);
      const isCancellable = job.status === 'pending' || job.status === 'in_progress';

      this.elements.crawlJobsTable.innerHTML += `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
            <a href="${job.startUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-900">
              ${truncateUrl(job.startUrl)}
            </a>
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
              ${job.status}
            </span>
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${formatDate(job.createdAt, 'MMM D, YYYY HH:mm')}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${job.endTime ? formatDate(job.endTime, 'MMM D, YYYY HH:mm') : '-'}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${job.processedUrls || 0} / ${job.foundUrls || 0}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            <button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${job.id}" data-action="view-crawl">
              <i class="fas fa-info-circle"></i> Details
            </button>
            <button class="text-red-600 hover:text-red-900 mr-2" data-id="${job.id}" data-action="delete-crawl-job">
              <i class="fas fa-trash"></i>
            </button>
            ${isCancellable ? `<button class="text-yellow-600 hover:text-yellow-900" data-id="${job.id}" data-action="cancel-crawl-job"><i class="fas fa-ban"></i> Cancel</button>` : ''}
          </td>
        </tr>`;
    });

    // Add event listeners to action buttons
    this.elements.crawlJobsTable.querySelectorAll('[data-action="view-crawl"]').forEach(button => {
      button.addEventListener('click', e => this.handleCrawlJobView(e));
    });

    this.elements.crawlJobsTable
      .querySelectorAll('[data-action="delete-crawl-job"]')
      .forEach(button => {
        button.addEventListener('click', e => this.handleCrawlJobDelete(e));
      });

    this.elements.crawlJobsTable
      .querySelectorAll('[data-action="cancel-crawl-job"]')
      .forEach(button => {
        button.addEventListener('click', e => this.handleCrawlJobCancel(e));
      });
  }

  /**
   * Render pagination
   */
  renderPagination() {
    const totalPages = Math.ceil(this.state.total / this.state.limit);
    const showingStart = this.state.total === 0 ? 0 : (this.state.page - 1) * this.state.limit + 1;
    const showingEnd = Math.min(this.state.page * this.state.limit, this.state.total);

    if (this.elements.paginationShowing) {
      this.elements.paginationShowing.textContent = `${showingStart}-${showingEnd}`;
    }

    if (this.elements.paginationTotal) {
      this.elements.paginationTotal.textContent = this.state.total;
    }

    if (this.elements.paginationCurrent) {
      this.elements.paginationCurrent.textContent = this.state.page;
    }

    if (this.elements.paginationPrev) {
      this.elements.paginationPrev.disabled = this.state.page <= 1;
    }

    if (this.elements.paginationNext) {
      this.elements.paginationNext.disabled = this.state.page >= totalPages;
    }
  }

  /**
   * Handle crawl job view
   * @param {Event} e - Click event
   */
  async handleCrawlJobView(e) {
    const id = e.currentTarget.dataset.id;
    window.location.href = `/dashboard/crawl-details.html?id=${id}`;
  }

  /**
   * Handle crawl job delete
   * @param {Event} e - Click event
   */
  async handleCrawlJobDelete(e) {
    const id = e.currentTarget.dataset.id;

    if (confirm('Are you sure you want to delete this crawl job and its associated data?')) {
      try {
        await ApiService.crawlJobs.deleteCrawlJob(id);
        await this.loadCrawlJobs(); // Refresh crawl jobs table
      } catch (error) {
        console.error('Error deleting crawl job:', error);
        alert(`Error: ${error.message}`);
      }
    }
  }

  /**
   * Handle crawl job cancel
   * @param {Event} e - Click event
   */
  async handleCrawlJobCancel(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm('Are you sure you want to cancel this crawl job?')) {
      try {
        await ApiService.crawlJobs.cancelCrawlJob(id);
        await this.loadCrawlJobs(); // Refresh crawl jobs table
        alert('Crawl job cancelled.');
      } catch (error) {
        console.error('Error cancelling crawl job:', error);
        alert(`Error: ${error.message}`);
      }
    }
  }

  /**
   * Show crawl details in a modal
   * @param {Object} details - Crawl job details
   */
  showCrawlDetailsModal(details) {
    let content = `
      <h2>Crawl Job Details</h2>
      <p><strong>Job ID:</strong> ${details.jobId}</p>
      <p><strong>Status:</strong> ${details.jobStatus}</p>
      <p><strong>Start URL:</strong> <a href="${details.startUrl}" target="_blank">${details.startUrl}</a></p>
      <p><strong>Processed URLs:</strong> ${details.processedUrls}</p>
      <p><strong>Found URLs:</strong> ${details.foundUrls}</p>
      <p><strong>Total Pages:</strong> ${details.totalPages || 0}</p>
      <p><strong>Start Time:</strong> ${details.startTime || 'N/A'}</p>
      <p><strong>End Time:</strong> ${details.endTime || 'N/A'}</p>
      <p><strong>Failed URLs:</strong> ${details.failedUrls && details.failedUrls.length ? details.failedUrls.join(', ') : 'None'}</p>
    `;

    if (details.pages && details.pages.length > 0) {
      content += `<h3>Scraped Pages (${details.pages.length})</h3>`;
      content += `<ul style="max-height:300px;overflow:auto;">`;
      details.pages.forEach(page => {
        content += `
          <li style="margin-bottom:10px;">
            <strong><a href="${page.url}" target="_blank">${page.title || page.url}</a></strong><br/>
            <em>Parent:</em> ${page.parentUrl || 'None'}<br/>
            <pre style="max-height:150px;overflow:auto;background:#f9f9f9;padding:5px;">${escapeHtml(page.content)}</pre>
          </li>`;
      });
      content += `</ul>`;
    } else {
      content += `<p>No individual pages saved for this crawl.</p>`;
    }

    // Basic crawl hierarchy visualization
    if (details.pages && details.pages.length > 0) {
      const tree = buildCrawlTree(details.pages, details.startUrl);
      content += `<h3>Crawl Hierarchy</h3>`;
      content += renderCrawlTree(tree);
    }

    // Also show raw markdown if available
    if (details.mcpResult && details.mcpResult.markdownData) {
      content += `
        <h3>Scraped Content (Markdown)</h3>
        <pre style="max-height:400px;overflow:auto;background:#f9f9f9;padding:10px;">
          ${escapeHtml(details.mcpResult.markdownData)}
        </pre>`;
    } else {
      content += `<p>No crawl content available.</p>`;
    }

    // Show sitemap JSON if available
    if (details.options?.mode === 'sitemap' && details.sitemap) {
      content += `
        <h3>Sitemap JSON</h3>
        <pre style="max-height:400px;overflow:auto;background:#f0f0f0;padding:10px;">
${escapeHtml(typeof details.sitemap === 'string' ? details.sitemap : JSON.stringify(details.sitemap, null, 2))}
        </pre>`;
    }

    const modalWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    modalWindow.document.write(`
      <html>
        <head>
          <title>Crawl Job Details</title>
          <style>
            body { font-family: sans-serif; margin: 20px; }
            h2 { margin-top: 20px; }
            pre { background: #f9f9f9; padding: 10px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
            ul { list-style-type: none; padding-left: 20px; }
            li { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    modalWindow.document.close();
  }
}

export default CrawlController;
