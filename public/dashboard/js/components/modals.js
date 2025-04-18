/**
 * Modals Component
 * Handles all modal dialogs in the dashboard
 */

import ApiService from '../services/api-service.js';
import Navigation from './navigation.js';

/**
 * Modal elements cache
 */
const elements = {
  // New crawl modal
  newCrawlModal: null,
  crawlCancelButton: null,
  crawlSubmitButton: null,
  newCrawlForm: null,
  newCrawlButton: null,
};

/**
 * Setup modals and bind events
 * @param {Object} controllers - Page controllers
 */
function setupModals(controllers) {
  cacheElements();
  bindEvents(controllers);
}

/**
 * Cache modal DOM elements
 */
function cacheElements() {
  // New crawl modal
  elements.newCrawlModal = document.getElementById('new-crawl-modal');
  elements.crawlCancelButton = document.getElementById('crawl-cancel');
  elements.crawlSubmitButton = document.getElementById('crawl-submit');
  elements.newCrawlForm = document.getElementById('new-crawl-form');
  elements.newCrawlButton = document.getElementById('new-crawl-button');
}

/**
 * Bind modal event listeners
 * @param {Object} controllers - Page controllers
 */
function bindEvents(controllers) {
  // New crawl modal
  if (elements.newCrawlButton) {
    elements.newCrawlButton.addEventListener('click', showNewCrawlModal);
  }

  if (elements.crawlCancelButton) {
    elements.crawlCancelButton.addEventListener('click', hideNewCrawlModal);
  }

  if (elements.crawlSubmitButton) {
    elements.crawlSubmitButton.addEventListener('click', () => submitNewCrawl(controllers));
  }
}

/**
 * Show new crawl modal
 */
function showNewCrawlModal() {
  if (elements.newCrawlModal) {
    elements.newCrawlModal.classList.remove('hidden');
  }
}

/**
 * Hide new crawl modal
 */
function hideNewCrawlModal() {
  if (elements.newCrawlModal) {
    elements.newCrawlModal.classList.add('hidden');
    if (elements.newCrawlForm) {
      elements.newCrawlForm.reset();
    }
  }
}

/**
 * Submit new crawl form
 * @param {Object} controllers - Page controllers
 */
async function submitNewCrawl(controllers) {
  try {
    const startUrl = document.getElementById('crawl-start-url').value;
    const maxDepthInput = document.getElementById('crawl-max-depth');
    const domainScope = document.getElementById('crawl-domain-scope').value;
    const useBrowser = document.getElementById('crawl-browser').checked;
    const mode = document.getElementById('crawl-mode')?.value || 'content';
    const browserType =
      document.querySelector('input[name="crawlBrowserType"]:checked')?.value || 'desktop';
    const useCookies = document.getElementById('crawl-use-cookies').checked;

    if (!startUrl) {
      alert('Please enter a Start URL');
      return;
    }

    let maxDepth = maxDepthInput.value ? parseInt(maxDepthInput.value, 10) : null;
    if (isNaN(maxDepth) || maxDepth < 0) {
      maxDepth = null;
    }

    await ApiService.crawlJobs.createCrawlJob({
      startUrl,
      maxDepth,
      domainScope,
      useBrowser,
      useCookies,
      mode,
      browserType,
    });

    hideNewCrawlModal();
    alert('Crawl job submitted successfully. Track status on the Crawl Jobs page.');

    // Navigate to crawl jobs page
    Navigation.navigateTo('crawlJobs');
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

export { setupModals, showNewCrawlModal, hideNewCrawlModal };
