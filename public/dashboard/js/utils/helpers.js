/**
 * Helper Utilities
 * Common utility functions used across the application
 */

/**
 * Truncate URL to a maximum length
 * @param {string} url - URL to truncate
 * @param {number} maxLength - Maximum length (default: 40)
 * @returns {string} Truncated URL
 */
function truncateUrl(url, maxLength = 40) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    let displayUrl = urlObj.hostname + urlObj.pathname;
    
    if (displayUrl.length > maxLength) {
      return displayUrl.substring(0, maxLength - 3) + '...';
    }
    
    return displayUrl;
  } catch (e) {
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
}

/**
 * Debounce function to limit the rate at which a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format date relative to current time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatRelativeDate(date) {
  if (!date) return '';
  return moment(date).fromNow();
}

/**
 * Format date with a specific pattern
 * @param {string|Date} date - Date to format
 * @param {string} format - Format pattern (default: 'MMM D, YYYY')
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'MMM D, YYYY') {
  if (!date) return '-';
  return moment(date).format(format);
}

/**
 * Escape HTML for safe display
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get status class for UI display
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'completed_with_errors':
      return 'bg-orange-100 text-orange-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Build tree structure from flat pages array
 * @param {Array} pages - Pages array
 * @param {string} rootUrl - Root URL
 * @returns {Object} Tree structure
 */
function buildCrawlTree(pages, rootUrl) {
  const map = {};
  pages.forEach(p => {
    map[p.url] = { ...p, children: [] };
  });
  
  const treeRoot = { url: rootUrl, children: [] };
  
  Object.values(map).forEach(node => {
    if (node.parentUrl && map[node.parentUrl]) {
      map[node.parentUrl].children.push(node);
    } else if (node.url === rootUrl) {
      treeRoot.children.push(node);
    } else {
      treeRoot.children.push(node); // Orphan nodes
    }
  });
  
  return treeRoot;
}

/**
 * Render a tree structure as HTML
 * @param {Object} node - Tree node
 * @returns {string} HTML representation
 */
function renderCrawlTree(node) {
  let html = `<ul>`;
  
  if (node.url) {
    html += `<li><a href="${node.url}" target="_blank">${node.title || node.url}</a>`;
  }
  
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      html += renderCrawlTree(child);
    });
  }
  
  if (node.url) {
    html += `</li>`;
  }
  
  html += `</ul>`;
  
  return html;
}

export {
  truncateUrl,
  debounce,
  formatRelativeDate,
  formatDate,
  escapeHtml,
  getStatusClass,
  buildCrawlTree,
  renderCrawlTree
};
