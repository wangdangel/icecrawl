/**
 * Navigation Component
 * Manages page navigation and active page tracking
 */

class Navigation {
  constructor() {
    this.activePage = 'dashboard';
    this.controllers = {};
    this.refreshInterval = null;
    this.elements = {
      navLinks: {},
      pages: {},
      userMenu: null,
      userMenuButton: null,
      userMenuLogout: null,
    };
  }

  /**
   * Initialize navigation
   * @param {Object} controllers - Page controllers
   */
  init(controllers) {
    this.controllers = controllers;
    this.cacheElements();
    this.bindEvents();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    // Navigation links
    this.elements.navLinks = {
      dashboard: document.getElementById('nav-dashboard'),
      jobs: document.getElementById('nav-jobs'),
      crawlJobs: document.getElementById('nav-crawl-jobs'),
      transformers: document.getElementById('nav-transformers'),
    };

    // Pages
    this.elements.pages = {
      dashboard: document.getElementById('page-dashboard'),
      jobs: document.getElementById('page-jobs'),
      crawlJobs: document.getElementById('page-crawl-jobs'),
      transformers: document.getElementById('page-transformers'),
    };

    // User menu
    this.elements.userMenu = document.getElementById('user-menu');
    this.elements.userMenuButton = document.getElementById('user-menu-button');
    this.elements.userMenuLogout = document.getElementById('user-menu-logout');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Navigation links
    Object.entries(this.elements.navLinks).forEach(([page, element]) => {
      if (element) {
        element.addEventListener('click', e => {
          e.preventDefault();
          this.navigateTo(page);
        });
      }
    });

    // User menu toggle
    if (this.elements.userMenuButton) {
      this.elements.userMenuButton.addEventListener('click', () => this.toggleUserMenu());
    }

    // Logout button
    if (this.elements.userMenuLogout) {
      this.elements.userMenuLogout.addEventListener('click', () => AuthService.logout());
    }
  }

  /**
   * Navigate to a specific page
   * @param {string} page - Page identifier
   */
  navigateTo(page) {
    // Validate page exists
    if (!this.elements.pages[page]) {
      console.error(`Page not found: ${page}`);
      return;
    }

    // Clear dashboard refresh interval if leaving dashboard
    if (this.activePage === 'dashboard' && page !== 'dashboard') {
      this.clearDashboardRefresh();
    }

    // Hide all pages
    Object.values(this.elements.pages).forEach(pageElement => {
      if (pageElement) pageElement.classList.add('hidden');
    });

    // Show target page
    this.elements.pages[page].classList.remove('hidden');

    // Update navigation highlights
    Object.values(this.elements.navLinks).forEach(navLink => {
      if (navLink) {
        navLink.classList.remove('text-indigo-100', 'bg-indigo-800');
        navLink.classList.add('text-white');
      }
    });

    const activeNav = this.elements.navLinks[page];
    if (activeNav) {
      activeNav.classList.add('text-indigo-100', 'bg-indigo-800');
      activeNav.classList.remove('text-white');
    }

    // Update active page
    this.activePage = page;

    // Initialize controller for the page
    if (this.controllers[page]) {
      this.controllers[page].init();
    }

    // Set up dashboard refresh interval if navigating to dashboard
    if (page === 'dashboard') {
      this.setupDashboardRefresh();
    }
  }

  /**
   * Toggle user menu visibility
   */
  toggleUserMenu() {
    if (this.elements.userMenu) {
      this.elements.userMenu.classList.toggle('hidden');
    }
  }

  /**
   * Set up dashboard refresh interval
   */
  setupDashboardRefresh() {
    if (!this.refreshInterval && this.controllers.dashboard) {
      this.refreshInterval = setInterval(() => {
        this.controllers.dashboard.loadDashboardStats();
      }, 30000); // Refresh every 30 seconds
      console.log('Dashboard refresh interval set up');
    }
  }

  /**
   * Clear dashboard refresh interval
   */
  clearDashboardRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('Dashboard refresh interval cleared');
    }
  }
}

// Singleton instance
if (!window.Navigation) {
  window.Navigation = new Navigation();
}

const navigation = new Navigation();
export default navigation;
