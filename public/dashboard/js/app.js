/**
 * Web Scraper Dashboard - Main Application
 * Entry point for dashboard functionality
 */

import AuthService from './services/auth-service.js';
import Navigation from './components/navigation.js';
import DashboardController from './controllers/dashboard-controller.js';
import JobsController from './controllers/jobs-controller.js';
import CrawlController from './controllers/crawl-controller.js';
import TransformerController from './controllers/transformers-controller.js';
import { setupModals } from './components/modals.js';

/**
 * Application state
 */
const App = {
  controllers: {},
  
  /**
   * Initialize the application
   */
  init() {
    // Check authentication first
    if (!AuthService.checkAuth()) {
      return; // Auth service will redirect if needed
    }
    
    // Setup controllers
    this.controllers = {
      dashboard: new DashboardController(),
      jobs: new JobsController(),
      crawlJobs: new CrawlController(),
      transformers: new TransformerController()
    };
    
    // Initialize navigation
    Navigation.init(this.controllers);
    
    // Initialize modals
    setupModals(this.controllers);
    
    // Set initial page
    Navigation.navigateTo('dashboard');
    
    console.log('Dashboard application initialized');
  }
};

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  const profileLink = document.getElementById('user-menu-profile');
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Profile logic
    });
  }

  const settingsLink = document.getElementById('user-menu-settings');
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'settings.html';
    });
  }
});

export default App;
