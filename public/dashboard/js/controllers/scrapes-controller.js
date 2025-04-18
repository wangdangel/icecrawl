/**
 * Scrapes Controller
 * Handles the My Scrapes page functionality
 */

import ApiService from '../services/api-service.js';
import { truncateUrl, debounce, formatDate } from '../utils/helpers.js';

class ScrapeController {
  constructor() {
    this.state = {
      scrapes: [],
      page: 1,
      limit: 10,
      total: 0,
      search: '',
      category: '',
      tag: '',
    };
    this.elements = {};
    this.initialized = false;
  }

  /**
   * Initialize scrapes controller
   */
  async init() {
    if (!this.initialized) {
      this.cacheElements();
      this.bindEvents();
      this.initialized = true;
    }

    await Promise.all([this.loadScrapes(), this.loadTags()]);
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      scrapesTable: document.getElementById('scrapes-table'),
      paginationPrev: document.getElementById('scrapes-pagination-prev'),
      paginationNext: document.getElementById('scrapes-pagination-next'),
      paginationCurrent: document.getElementById('scrapes-pagination-current'),
      paginationShowing: document.getElementById('scrapes-pagination-showing'),
      paginationTotal: document.getElementById('scrapes-pagination-total'),
      searchInput: document.getElementById('search'),
      categorySelect: document.getElementById('category'),
      tagSelect: document.getElementById('tag'),
    };
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Search input debounced event
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener(
        'input',
        debounce(() => {
          this.state.search = this.elements.searchInput.value;
          this.state.page = 1;
          this.loadScrapes();
        }, 300),
      );
    }

    // Category filter change
    if (this.elements.categorySelect) {
      this.elements.categorySelect.addEventListener('change', () => {
        this.state.category = this.elements.categorySelect.value;
        this.state.page = 1;
        this.loadScrapes();
      });
    }

    // Tag filter change
    if (this.elements.tagSelect) {
      this.elements.tagSelect.addEventListener('change', () => {
        this.state.tag = this.elements.tagSelect.value;
        this.state.page = 1;
        this.loadScrapes();
      });
    }

    // Pagination
    if (this.elements.paginationPrev) {
      this.elements.paginationPrev.addEventListener('click', () => {
        if (this.state.page > 1) {
          this.state.page--;
          this.loadScrapes();
        }
      });
    }

    if (this.elements.paginationNext) {
      this.elements.paginationNext.addEventListener('click', () => {
        if (this.state.page < Math.ceil(this.state.total / this.state.limit)) {
          this.state.page++;
          this.loadScrapes();
        }
      });
    }
  }

  /**
   * Load scrapes data
   */
  async loadScrapes() {
    try {
      const params = {
        page: this.state.page,
        limit: this.state.limit,
        search: this.state.search,
        category: this.state.category,
        tag: this.state.tag,
      };

      const result = await ApiService.scrapes.getScrapes(params);

      this.state.scrapes = result.scrapes || [];
      this.state.total = result.pagination.total || 0;

      this.renderScrapesTable();
      this.renderPagination();
    } catch (error) {
      console.error('Error loading scrapes:', error);
      if (this.elements.scrapesTable) {
        this.elements.scrapesTable.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-red-600">
              Error loading scrapes: ${error.message}
            </td>
          </tr>`;
      }
    }
  }

  /**
   * Load tags for filter
   */
  async loadTags() {
    try {
      const tags = await ApiService.dashboard.getTags();
      this.renderTagsSelect(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  /**
   * Render scrapes table
   */
  renderScrapesTable() {
    if (!this.elements.scrapesTable) {
      console.error('Scrapes table element not found');
      return;
    }

    this.elements.scrapesTable.innerHTML = '';

    if (this.state.scrapes.length === 0) {
      this.elements.scrapesTable.innerHTML = `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="5">
            No scrapes found
          </td>
        </tr>`;
      return;
    }

    this.state.scrapes.forEach(scrape => {
      this.elements.scrapesTable.innerHTML += `
        <tr>
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
            <a href="/scrape/${scrape.id}" class="text-indigo-600 hover:text-indigo-900">
              ${scrape.title || 'Untitled'}
            </a>
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            <a href="${scrape.url}" target="_blank" class="text-gray-500 hover:text-gray-900">
              ${truncateUrl(scrape.url)}
            </a>
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${scrape.category || '-'}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${formatDate(scrape.createdAt)}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            <button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${scrape.id}" data-action="view">
              <i class="fas fa-eye"></i>
            </button>
            <button class="text-yellow-600 hover:text-yellow-900 mr-2" data-id="${scrape.id}" data-action="favorite">
              <i class="fas ${scrape.isFavorite ? 'fa-star' : 'fa-star-o'}"></i>
            </button>
            <button class="text-red-600 hover:text-red-900" data-id="${scrape.id}" data-action="delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });

    // Add event listeners to action buttons
    this.elements.scrapesTable.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', e => this.handleScrapeAction(e));
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
   * Render tags select options
   * @param {Array} tags - Tags data
   */
  renderTagsSelect(tags) {
    const tagSelect = this.elements.tagSelect;

    if (!tagSelect) {
      console.error('Tag select element not found');
      return;
    }

    // Clear existing options (keep the first "All Tags" option)
    while (tagSelect.options.length > 1) {
      tagSelect.remove(1);
    }

    // Add tags as options
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.id;
      option.textContent = tag.name;
      tagSelect.appendChild(option);
    });
  }

  /**
   * Handle scrape action (view, favorite, delete)
   * @param {Event} e - Click event
   */
  async handleScrapeAction(e) {
    const action = e.currentTarget.dataset.action;
    const id = e.currentTarget.dataset.id;

    if (action === 'view') {
      window.location.href = `/scrape/${id}`;
    } else if (action === 'favorite') {
      try {
        const isCurrentlyFavorite = e.currentTarget
          .querySelector('i')
          .classList.contains('fa-star');
        await ApiService.scrapes.toggleFavorite(id, !isCurrentlyFavorite);
        await this.loadScrapes(); // Refresh table
      } catch (error) {
        console.error('Error updating favorite status:', error);
        alert(`Error: ${error.message}`);
      }
    } else if (action === 'delete') {
      if (confirm('Are you sure you want to delete this scrape? This action cannot be undone.')) {
        try {
          await ApiService.scrapes.deleteScrape(id);
          await this.loadScrapes(); // Refresh table
        } catch (error) {
          console.error('Error deleting scrape:', error);
          alert(`Error: ${error.message}`);
        }
      }
    }
  }
}

export default ScrapeController;
