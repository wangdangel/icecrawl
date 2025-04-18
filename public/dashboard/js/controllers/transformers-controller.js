/**
 * Transformers Controller
 * Handles the Transformers page functionality
 */

import ApiService from '../services/api-service.js';
import AuthService from '../services/auth-service.js';

class TransformerController {
  constructor() {
    this.transformers = [];
    this.elements = {};
    this.initialized = false;
  }

  /**
   * Initialize transformers controller
   */
  async init() {
    if (!this.initialized) {
      this.cacheElements();
      this.initialized = true;
    }

    await this.loadTransformers();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      transformersList: document.getElementById('transformers-list'),
    };
  }

  /**
   * Load available transformers
   */
  async loadTransformers() {
    try {
      this.transformers = await ApiService.transformers.getTransformers();
      this.renderTransformers();
    } catch (error) {
      console.error('Error loading transformers:', error);

      // Special handling for 404 (API not implemented yet)
      if (error.message.includes('404') && this.elements.transformersList) {
        this.elements.transformersList.innerHTML = `
          <div class="bg-yellow-50 p-4 rounded-md">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-info-circle text-yellow-400"></i>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">Transformers API</h3>
                <div class="mt-2 text-sm text-yellow-700">
                  <p>The transformer API is currently under development. The default transformers are displayed.</p>
                </div>
              </div>
            </div>
          </div>`;

        // Show default transformers instead
        this.renderDefaultTransformers();
      } else if (this.elements.transformersList) {
        this.elements.transformersList.innerHTML = `
          <div class="bg-red-50 p-4 rounded-md">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-exclamation-circle text-red-400"></i>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Error loading transformers</h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>${error.message}</p>
                </div>
              </div>
            </div>
          </div>`;
      }
    }
  }

  /**
   * Render transformers list
   */
  renderTransformers() {
    if (!this.elements.transformersList) {
      console.error('Transformers list element not found');
      return;
    }

    this.elements.transformersList.innerHTML = '';

    if (this.transformers.length === 0) {
      this.elements.transformersList.innerHTML =
        '<p class="text-gray-500">No transformers available</p>';
      return;
    }

    this.transformers.forEach(transformer => {
      this.elements.transformersList.innerHTML += `
        <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <i class="fas fa-cogs text-indigo-600 text-xl"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-md font-medium text-gray-900">${transformer.name}</h3>
              <p class="mt-1 text-sm text-gray-500">${transformer.description}</p>
            </div>
          </div>
          <div class="mt-4">
            <button type="button" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-transformer="${transformer.name}">
              Apply
            </button>
          </div>
        </div>`;
    });

    // Add event listeners to transformer buttons
    this.elements.transformersList.querySelectorAll('[data-transformer]').forEach(button => {
      button.addEventListener('click', e => this.handleTransformerApply(e));
    });
  }

  /**
   * Render default transformers when API is not available
   */
  renderDefaultTransformers() {
    if (!this.elements.transformersList) {
      return;
    }

    const defaultTransformers = [
      {
        name: 'Language Detector',
        description: 'Detects the language of the text content',
        icon: 'fa-language',
      },
      {
        name: 'Text Summarizer',
        description: 'Creates a summary of the text content',
        icon: 'fa-edit',
      },
      {
        name: 'Keyword Extractor',
        description: 'Extracts keywords from the text content',
        icon: 'fa-key',
      },
      {
        name: 'Sentiment Analyzer',
        description: 'Analyzes the sentiment of the text content',
        icon: 'fa-smile',
      },
      {
        name: 'Entity Recognizer',
        description: 'Identifies entities (people, places, organizations) in the text',
        icon: 'fa-tag',
      },
    ];

    defaultTransformers.forEach(transformer => {
      this.elements.transformersList.innerHTML += `
        <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <i class="fas ${transformer.icon} text-indigo-600 text-xl"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-md font-medium text-gray-900">${transformer.name}</h3>
              <p class="mt-1 text-sm text-gray-500">${transformer.description}</p>
            </div>
          </div>
          <div class="mt-4">
            <button type="button" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-transformer="${transformer.name}">
              Apply
            </button>
          </div>
        </div>`;
    });

    // Add event listeners to transformer buttons
    this.elements.transformersList.querySelectorAll('[data-transformer]').forEach(button => {
      button.addEventListener('click', e => this.handleTransformerApply(e));
    });
  }

  /**
   * Handle transformer apply button click
   * @param {Event} e - Click event
   */
  async handleTransformerApply(e) {
    const transformer = e.currentTarget.dataset.transformer;
    const inputEl = document.getElementById('transform-input');
    const resultEl = document.getElementById('transform-result');

    if (!inputEl || !resultEl) {
      alert('Input or result element not found.');
      return;
    }

    const content = inputEl.value.trim();
    if (!content) {
      alert('Please enter some content to transform.');
      return;
    }

    try {
      resultEl.textContent = 'Applying transformer...';

      const token = AuthService.getToken();
      if (!token) {
        alert('You must be logged in to perform transformations.');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(
        `/api/transform/transformers/${encodeURIComponent(transformer)}/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        resultEl.textContent = `Error: ${response.status} ${response.statusText}\n${errorText}`;
        return;
      }

      const data = await response.json();
      resultEl.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      resultEl.textContent = `Error applying transformer: ${error.message || error}`;
    }
  }
}

export default TransformerController;
