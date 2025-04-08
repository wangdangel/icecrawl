/**
 * Global application state and shared variables
 */

export const state = {
  token: null,
  user: null,
  activePage: 'dashboard',
  scrapes: {
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  },
  jobs: {
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  },
  crawlJobs: {
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  }
};

// Global Chart.js instance for activity chart
export let activityChartInstance = null;

// Dashboard refresh interval ID
export let dashboardRefreshInterval = null;

/**
 * Setters for mutable exported variables
 */
export function setActivityChartInstance(instance) {
  activityChartInstance = instance;
}

export function setDashboardRefreshInterval(intervalId) {
  dashboardRefreshInterval = intervalId;
}
