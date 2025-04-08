/**
 * Web Scraper Dashboard - Main Application
 * Entry point for dashboard functionality
 */

import AuthService from './services/auth-service.js';
import Navigation from './components/navigation.js';
import DashboardController from './controllers/dashboard-controller.js';
import ScrapeController from './controllers/scrapes-controller.js';
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
      scrapes: new ScrapeController(),
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

export default App;
