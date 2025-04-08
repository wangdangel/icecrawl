/**
 * Jobs Controller
 * Handles the Scrape Jobs page functionality
 */

import ApiService from '../services/api-service.js';
import { truncateUrl, formatDate, getStatusClass } from '../utils/helpers.js';

class JobsController {
  constructor() {
    this.state = {
      jobs: [],
      page: 1,
      limit: 10,
      total: 0,
      status: ''
    };
    this.elements = {};
    this.initialized = false;
  }
  
  /**
   * Initialize jobs controller
   */
  async init() {
    if (!this.initialized) {
      this.cacheElements();
      this.bindEvents();
      this.initialized = true;
    }
    
    await this.loadJobs();
  }
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      jobsTable: document.getElementById('jobs-table'),
      paginationPrev: document.getElementById('jobs-pagination-prev'),
      paginationNext: document.getElementById('jobs-pagination-next'),
      paginationCurrent: document.getElementById('jobs-pagination-current'),
      paginationShowing: document.getElementById('jobs-pagination-showing'),
      paginationTotal: document.getElementById('jobs-pagination-total'),
      statusFilter: document.getElementById('status-filter'),
      scheduleJobButton: document.getElementById('schedule-job-button')
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
        this.loadJobs();
      });
    }
    
    // Pagination
    if (this.elements.paginationPrev) {
      this.elements.paginationPrev.addEventListener('click', () => {
        if (this.state.page > 1) {
          this.state.page--;
          this.loadJobs();
        }
      });
    }
    
    if (this.elements.paginationNext) {
      this.elements.paginationNext.addEventListener('click', () => {
        if (this.state.page < Math.ceil(this.state.total / this.state.limit)) {
          this.state.page++;
          this.loadJobs();
        }
      });
    }
    
    // Schedule job button
    if (this.elements.scheduleJobButton) {
      this.elements.scheduleJobButton.addEventListener('click', () => {
        alert('Schedule job functionality is not implemented yet.');
        // TODO: Implement scheduled jobs
      });
    }
  }
  
  /**
   * Load jobs data
   */
  async loadJobs() {
    try {
      const params = {
        page: this.state.page,
        limit: this.state.limit,
        status: this.state.status
      };
      
      const result = await ApiService.jobs.getJobs(params);
      
      this.state.jobs = result.jobs || [];
      this.state.total = result.pagination.total || 0;
      
      this.renderJobsTable();
      this.renderPagination();
    } catch (error) {
      console.error('Error loading jobs:', error);
      if (this.elements.jobsTable) {
        this.elements.jobsTable.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-red-600">
              Error loading jobs: ${error.message}
            </td>
          </tr>`;
      }
    }
  }
  
  /**
   * Render jobs table
   */
  renderJobsTable() {
    if (!this.elements.jobsTable) {
      console.error('Jobs table element not found');
      return;
    }
    
    this.elements.jobsTable.innerHTML = '';
    
    if (this.state.jobs.length === 0) {
      this.elements.jobsTable.innerHTML = `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="5">
            No jobs found
          </td>
        </tr>`;
      return;
    }
    
    this.state.jobs.forEach(job => {
      const statusClass = getStatusClass(job.status);
      
      this.elements.jobsTable.innerHTML += `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
            <a href="${job.url}" target="_blank" class="text-indigo-600 hover:text-indigo-900">
              ${truncateUrl(job.url)}
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
            ${job.status === 'completed' ? 
              `<a href="/scrape/${job.resultId}" class="text-indigo-600 hover:text-indigo-900 mr-2">
                <i class="fas fa-eye"></i> View
              </a>` : ''}
            ${job.status === 'failed' ? 
              `<button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${job.id}" data-action="retry">
                <i class="fas fa-redo"></i> Retry
              </button>` : ''}
            <button class="text-red-600 hover:text-red-900" data-id="${job.id}" data-action="delete-job">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });
    
    // Add event listeners to action buttons
    this.elements.jobsTable.querySelectorAll('[data-action="retry"]').forEach(button => {
      button.addEventListener('click', e => this.handleJobRetry(e));
    });
    
    this.elements.jobsTable.querySelectorAll('[data-action="delete-job"]').forEach(button => {
      button.addEventListener('click', e => this.handleJobDelete(e));
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
   * Handle job retry
   * @param {Event} e - Click event
   */
  async handleJobRetry(e) {
    const id = e.currentTarget.dataset.id;
    
    try {
      await ApiService.jobs.retryJob(id);
      await this.loadJobs(); // Refresh jobs table
    } catch (error) {
      console.error('Error retrying job:', error);
      alert(`Error: ${error.message}`);
    }
  }
  
  /**
   * Handle job delete
   * @param {Event} e - Click event
   */
  async handleJobDelete(e) {
    const id = e.currentTarget.dataset.id;
    
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        await ApiService.jobs.deleteJob(id);
        await this.loadJobs(); // Refresh jobs table
      } catch (error) {
        console.error('Error deleting job:', error);
        alert(`Error: ${error.message}`);
      }
    }
  }
}

export default JobsController;
