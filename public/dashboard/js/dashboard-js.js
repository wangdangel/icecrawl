/**
 * Web Scraper Dashboard JavaScript
 * Handles dashboard UI interaction and API calls
 */

// Global state
const state = {
  token: null,
  user: null,
  activePage: 'dashboard',
  scrapes: {
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  },
  jobs: { // Scrape jobs
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  },
  crawlJobs: { // Crawl jobs
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  }
};

// Global variable to hold the chart instance
let activityChartInstance = null;
// Global variable for dashboard refresh interval
let dashboardRefreshInterval = null;

// --- DOM Element References ---
let navDashboard, navScrapes, navJobs, navCrawlJobs, navTransformers;
let userMenuButton, userMenu, userInitials, userMenuLogout;
let newScrapeButton, newCrawlButton;
let newScrapeModal, scrapeCancelButton, scrapeSubmitButton, newScrapeForm;
let newCrawlModal, crawlCancelButton, crawlSubmitButton, newCrawlForm;
let pageDashboard, pageScrapes, pageJobs, pageCrawlJobs, pageTransformers;
let scrapesTable, scrapesPaginationPrev, scrapesPaginationNext, scrapesPaginationCurrent, scrapesPaginationShowing, scrapesPaginationTotal;
let jobsTable, jobsPaginationPrev, jobsPaginationNext, jobsPaginationCurrent, jobsPaginationShowing, jobsPaginationTotal, statusFilter;
let crawlJobsTable, crawlJobsPaginationPrev, crawlJobsPaginationNext, crawlJobsPaginationCurrent, crawlJobsPaginationShowing, crawlJobsPaginationTotal, crawlStatusFilter;
// Add other element references as needed

function cacheDOMElements() {
  navDashboard = document.getElementById('nav-dashboard');
  navScrapes = document.getElementById('nav-scrapes');
  navJobs = document.getElementById('nav-jobs');
  navCrawlJobs = document.getElementById('nav-crawl-jobs');
  navTransformers = document.getElementById('nav-transformers');

  userMenuButton = document.getElementById('user-menu-button');
  userMenu = document.getElementById('user-menu');
  userInitials = document.getElementById('user-initials');
  userMenuLogout = document.getElementById('user-menu-logout');

  newScrapeButton = document.getElementById('new-scrape-button');
  newCrawlButton = document.getElementById('new-crawl-button');

  newScrapeModal = document.getElementById('new-scrape-modal');
  scrapeCancelButton = document.getElementById('scrape-cancel');
  scrapeSubmitButton = document.getElementById('scrape-submit');
  newScrapeForm = document.getElementById('new-scrape-form');

  newCrawlModal = document.getElementById('new-crawl-modal');
  crawlCancelButton = document.getElementById('crawl-cancel');
  crawlSubmitButton = document.getElementById('crawl-submit');
  newCrawlForm = document.getElementById('new-crawl-form');

  pageDashboard = document.getElementById('page-dashboard');
  pageScrapes = document.getElementById('page-scrapes');
  pageJobs = document.getElementById('page-jobs');
  pageCrawlJobs = document.getElementById('page-crawl-jobs');
  pageTransformers = document.getElementById('page-transformers');

  scrapesTable = document.getElementById('scrapes-table');
  scrapesPaginationPrev = document.getElementById('scrapes-pagination-prev');
  scrapesPaginationNext = document.getElementById('scrapes-pagination-next');
  scrapesPaginationCurrent = document.getElementById('scrapes-pagination-current');
  scrapesPaginationShowing = document.getElementById('scrapes-pagination-showing');
  scrapesPaginationTotal = document.getElementById('scrapes-pagination-total');

  jobsTable = document.getElementById('jobs-table');
  jobsPaginationPrev = document.getElementById('jobs-pagination-prev');
  jobsPaginationNext = document.getElementById('jobs-pagination-next');
  jobsPaginationCurrent = document.getElementById('jobs-pagination-current');
  jobsPaginationShowing = document.getElementById('jobs-pagination-showing');
  jobsPaginationTotal = document.getElementById('jobs-pagination-total');
  statusFilter = document.getElementById('status-filter');

  crawlJobsTable = document.getElementById('crawl-jobs-table');
  crawlJobsPaginationPrev = document.getElementById('crawl-jobs-pagination-prev');
  crawlJobsPaginationNext = document.getElementById('crawl-jobs-pagination-next');
  crawlJobsPaginationCurrent = document.getElementById('crawl-jobs-pagination-current');
  crawlJobsPaginationShowing = document.getElementById('crawl-jobs-pagination-showing');
  crawlJobsPaginationTotal = document.getElementById('crawl-jobs-pagination-total');
  crawlStatusFilter = document.getElementById('crawl-status-filter');
}


// --- Event Listeners Setup ---
function setupEventListeners() {
  // Navigation
  navDashboard.addEventListener('click', e => { e.preventDefault(); switchPage('dashboard'); });
  navScrapes.addEventListener('click', e => { e.preventDefault(); switchPage('scrapes'); });
  navJobs.addEventListener('click', e => { e.preventDefault(); switchPage('jobs'); });
  navCrawlJobs.addEventListener('click', e => { e.preventDefault(); switchPage('crawl-jobs'); });
  navTransformers.addEventListener('click', e => { e.preventDefault(); switchPage('transformers'); });

  // User menu
  userMenuButton.addEventListener('click', toggleUserMenu);
  userMenuLogout.addEventListener('click', logout);

  // New scrape/crawl buttons & modals
  newScrapeButton.addEventListener('click', showNewScrapeModal);
  scrapeCancelButton.addEventListener('click', hideNewScrapeModal);
  scrapeSubmitButton.addEventListener('click', submitNewScrape);

  newCrawlButton.addEventListener('click', showNewCrawlModal);
  crawlCancelButton.addEventListener('click', hideNewCrawlModal);
  crawlSubmitButton.addEventListener('click', submitNewCrawl);

  // Pagination for scrapes
  scrapesPaginationPrev.addEventListener('click', () => {
    if (state.scrapes.page > 1) { state.scrapes.page--; loadScrapes(); }
  });
  scrapesPaginationNext.addEventListener('click', () => {
    if (state.scrapes.page < Math.ceil(state.scrapes.total / state.scrapes.limit)) { state.scrapes.page++; loadScrapes(); }
  });

  // Pagination for scrape jobs
  jobsPaginationPrev.addEventListener('click', () => {
    if (state.jobs.page > 1) { state.jobs.page--; loadJobs(); }
  });
  jobsPaginationNext.addEventListener('click', () => {
    if (state.jobs.page < Math.ceil(state.jobs.total / state.jobs.limit)) { state.jobs.page++; loadJobs(); }
  });

  // Pagination for crawl jobs
  crawlJobsPaginationPrev.addEventListener('click', () => {
    if (state.crawlJobs.page > 1) { state.crawlJobs.page--; loadCrawlJobs(); }
  });
  crawlJobsPaginationNext.addEventListener('click', () => {
    if (state.crawlJobs.page < Math.ceil(state.crawlJobs.total / state.crawlJobs.limit)) { state.crawlJobs.page++; loadCrawlJobs(); }
  });

  // View all scrapes link
  document.getElementById('view-all-scrapes').addEventListener('click', e => { e.preventDefault(); switchPage('scrapes'); });

  // Search input on scrapes page
  document.getElementById('search').addEventListener('input', debounce(() => { state.scrapes.page = 1; loadScrapes(); }, 300));

  // Category and tag filters on scrapes page
  document.getElementById('category').addEventListener('change', () => { state.scrapes.page = 1; loadScrapes(); });
  document.getElementById('tag').addEventListener('change', () => { state.scrapes.page = 1; loadScrapes(); });

  // Status filter on scrape jobs page
  statusFilter.addEventListener('change', () => { state.jobs.page = 1; loadJobs(); });

  // Status filter on crawl jobs page
  crawlStatusFilter.addEventListener('change', () => { state.crawlJobs.page = 1; loadCrawlJobs(); });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements(); // Cache elements first
  checkAuth(); // Then check auth (which might redirect)
  if (state.token) { // Only setup listeners if authenticated
      setupEventListeners();
  }
});


// --- Authentication ---
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (token && user) {
    state.token = token;
    state.user = JSON.parse(user);

    // Set user initials
    const userInitials = state.user.username.substring(0, 2).toUpperCase();
    userInitials.textContent = userInitials;

    // Load initial data
    loadDashboardData();
  } else {
    // Redirect to login page
    window.location.href = '/login';
  }
}

// --- Data Loading ---
function loadDashboardData() {
  // Show active page (might load data itself)
  switchPage(state.activePage);
  // Explicitly load dashboard data if that's the active page
  if (state.activePage === 'dashboard') {
      loadDashboardStats();
      loadRecentScrapes();
  }
}

function loadDataForCurrentPage() {
  if (state.activePage === 'dashboard') {
    loadDashboardStats();
    loadRecentScrapes();
  } else if (state.activePage === 'scrapes') {
    loadScrapes();
    loadTags(); // Load tags for filter
  } else if (state.activePage === 'jobs') {
    loadJobs();
  } else if (state.activePage === 'crawl-jobs') {
    loadCrawlJobs();
  } else if (state.activePage === 'transformers') {
    loadTransformers();
  }
}

// Load dashboard statistics
async function loadDashboardStats() {
  console.log('Attempting to load dashboard stats...'); // Keep this existing log
  try {
    // Add cache busting parameter to prevent browser caching
    const cacheBuster = new Date().getTime();
    const response = await fetch(`/api/dashboard/statistics?_=${cacheBuster}`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
      cache: 'no-store' // Re-add this to force fresh data
    });

    if (!response.ok) throw new Error(`Failed to load dashboard statistics: ${response.status}`);
    const result = await response.json();

    if (result.status === 'success') {
      console.log('Dashboard data received:', result.data); // Log the entire data object

      // Safely update DOM elements with explicit type conversion to handle null/undefined
      document.getElementById('stat-total-scrapes').textContent = Number(result.data.totalScrapes || 0);
      document.getElementById('stat-favorites').textContent = Number(result.data.totalFavorites || 0);

      const pendingJobs =
        (Number(result.data.scrapeJobStats?.pending) || 0) +
        (Number(result.data.crawlJobStats?.pending) || 0);

      const failedJobs =
        (Number(result.data.scrapeJobStats?.failed) || 0) +
        (Number(result.data.crawlJobStats?.failed) || 0);

      document.getElementById('stat-pending-jobs').textContent = pendingJobs;
      document.getElementById('stat-failed-jobs').textContent = failedJobs;

      // Only create chart if we have data
      if (Array.isArray(result.data.scrapesByDay) && result.data.scrapesByDay.length > 0) {
        createActivityChart(result.data.scrapesByDay);
      } else {
        console.warn('No scrapesByDay data available for chart');
        // Create empty chart or show "No data" message
        createActivityChart([]);
      }

      // Render top domains if available
      if (Array.isArray(result.data.topDomains)) {
        renderTopDomains(result.data.topDomains);
      } else {
        console.warn('No topDomains data available');
      }

      console.log('Successfully loaded and updated dashboard stats.');
    } else {
      console.error('API Error:', result.message);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

function renderTopDomains(domains) {
     const topDomainsTable = document.getElementById('top-domains-table');
      topDomainsTable.innerHTML = '';
      if (domains.length === 0) {
        topDomainsTable.innerHTML = `<tr><td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="2">No data available</td></tr>`;
      } else {
        domains.forEach(domain => {
          topDomainsTable.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">${domain.domain}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${domain.count}</td>
            </tr>`;
        });
      }
}

// Create activity chart
function createActivityChart(data) {
  if (activityChartInstance) activityChartInstance.destroy();
  const ctx = document.getElementById('scraping-activity-chart').getContext('2d');
  const labels = data.map(item => moment(item.date).format('MMM D'));
  const values = data.map(item => item.count);

  activityChartInstance = new Chart(ctx, { /* ... chart config ... */
     type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Scrapes',
        data: values,
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, precision: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: context => `${context.parsed.y} scrapes` } }
      }
    }
  });
}

// Load recent scrapes
async function loadRecentScrapes() {
  try {
    const response = await fetch('/api/dashboard/recent-scrapes?limit=5', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error('Failed to load recent scrapes');
    const result = await response.json();
    if (result.status === 'success') {
      renderRecentScrapes(result.data.scrapes);
    } else {
      console.error('Error loading recent scrapes:', result.message);
    }
  } catch (error) {
    console.error('Error loading recent scrapes:', error);
  }
}

function renderRecentScrapes(scrapes) {
    const table = document.getElementById('recent-scrapes-table');
    table.innerHTML = '';
    if (scrapes.length === 0) {
        table.innerHTML = `<tr><td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="2">No scrapes found</td></tr>`;
    } else {
        scrapes.forEach(scrape => {
          table.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                <a href="/scrape/${scrape.id}" class="text-indigo-600 hover:text-indigo-900">${scrape.title || 'Untitled'}</a>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${moment(scrape.createdAt).fromNow()}</td>
            </tr>`;
        });
    }
}

// Load scrapes for My Scrapes page
async function loadScrapes() {
  try {
    const params = new URLSearchParams({
      page: state.scrapes.page,
      limit: state.scrapes.limit,
      search: document.getElementById('search').value,
      category: document.getElementById('category').value,
      tag: document.getElementById('tag').value
    });
    // Remove empty params
    for(let p of params) { if (!p[1]) params.delete(p[0]); }

    const response = await fetch(`/api/dashboard/scrapes?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error('Failed to load scrapes');
    const result = await response.json();

    if (result.status === 'success') {
      state.scrapes.data = result.data.scrapes;
      state.scrapes.total = result.data.pagination.total;
      renderScrapesTable(state.scrapes.data);
      renderPagination('scrapes', state.scrapes);
    } else {
      console.error('Error loading scrapes:', result.message);
      scrapesTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-600">Error loading scrapes: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error('Error loading scrapes:', error);
     scrapesTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-600">Error loading scrapes: ${error.message}</td></tr>`;
  }
}

function renderScrapesTable(scrapes) {
    scrapesTable.innerHTML = '';
    if (scrapes.length === 0) {
        scrapesTable.innerHTML = `<tr><td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="5">No scrapes found</td></tr>`;
    } else {
        scrapes.forEach(scrape => {
          scrapesTable.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                <a href="/scrape/${scrape.id}" class="text-indigo-600 hover:text-indigo-900">${scrape.title || 'Untitled'}</a>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <a href="${scrape.url}" target="_blank" class="text-gray-500 hover:text-gray-900">${truncateUrl(scrape.url)}</a>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${scrape.category || '-'}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${moment(scrape.createdAt).format('MMM D, YYYY')}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${scrape.id}" data-action="view"><i class="fas fa-eye"></i></button>
                <button class="text-yellow-600 hover:text-yellow-900 mr-2" data-id="${scrape.id}" data-action="favorite"><i class="fas ${scrape.isFavorite ? 'fa-star' : 'fa-star-o'}"></i></button>
                <button class="text-red-600 hover:text-red-900" data-id="${scrape.id}" data-action="delete"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
        });
        // Add event listeners to action buttons
        scrapesTable.querySelectorAll('[data-action]').forEach(button => {
          button.addEventListener('click', handleScrapeAction);
        });
    }
}

// Load tags for filter
async function loadTags() {
  try {
    const response = await fetch('/api/dashboard/tags', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error('Failed to load tags');
    const result = await response.json();
    if (result.status === 'success') {
      const tagSelect = document.getElementById('tag');
      while (tagSelect.options.length > 1) tagSelect.remove(1); // Clear existing
      result.data.tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id; // Use ID or name? Assuming name for now
        option.textContent = tag.name;
        tagSelect.appendChild(option);
      });
    } else {
      console.error('Error loading tags:', result.message);
    }
  } catch (error) {
    console.error('Error loading tags:', error);
  }
}

// Load scrape jobs for Jobs page
async function loadJobs() {
  try {
    const params = new URLSearchParams({
      page: state.jobs.page,
      limit: state.jobs.limit,
      status: statusFilter.value
    });
    if (!statusFilter.value) params.delete('status');

    // TODO: Update API endpoint if needed
    const response = await fetch(`/api/dashboard/scrape-jobs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error(`Failed to load scrape jobs: ${response.statusText}`);
    const result = await response.json();

    if (result.status === 'success') {
      state.jobs.data = result.data.jobs;
      state.jobs.total = result.data.pagination.total;
      renderJobsTable(state.jobs.data);
      renderPagination('jobs', state.jobs);
    } else {
      console.error('Error loading jobs:', result.message);
      jobsTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-600">Error loading jobs: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error('Error loading jobs:', error);
    jobsTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-600">Error loading jobs: ${error.message}</td></tr>`;
  }
}

function renderJobsTable(jobs) {
    jobsTable.innerHTML = '';
    if (jobs.length === 0) {
        jobsTable.innerHTML = `<tr><td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="5">No jobs found</td></tr>`;
    } else {
        jobs.forEach(job => {
          let statusClass = 'bg-gray-100 text-gray-800';
          if (job.status === 'pending') statusClass = 'bg-yellow-100 text-yellow-800';
          if (job.status === 'processing') statusClass = 'bg-blue-100 text-blue-800';
          if (job.status === 'completed') statusClass = 'bg-green-100 text-green-800';
          if (job.status === 'failed') statusClass = 'bg-red-100 text-red-800';

          jobsTable.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0"><a href="${job.url}" target="_blank" class="text-indigo-600 hover:text-indigo-900">${truncateUrl(job.url)}</a></td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${job.status}</span></td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${moment(job.createdAt).format('MMM D, YYYY HH:mm')}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${job.endTime ? moment(job.endTime).format('MMM D, YYYY HH:mm') : '-'}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                ${job.status === 'completed' ? `<a href="/scrape/${job.resultId}" class="text-indigo-600 hover:text-indigo-900 mr-2"><i class="fas fa-eye"></i> View</a>` : ''}
                ${job.status === 'failed' ? `<button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${job.id}" data-action="retry"><i class="fas fa-redo"></i> Retry</button>` : ''}
                <button class="text-red-600 hover:text-red-900" data-id="${job.id}" data-action="delete-job"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
        });
        jobsTable.querySelectorAll('[data-action="retry"]').forEach(b => b.addEventListener('click', handleJobRetry));
        jobsTable.querySelectorAll('[data-action="delete-job"]').forEach(b => b.addEventListener('click', handleJobDelete));
    }
}

// Load crawl jobs for Crawl Jobs page (New)
async function loadCrawlJobs() {
  try {
    const params = new URLSearchParams({
      page: state.crawlJobs.page,
      limit: state.crawlJobs.limit,
      status: crawlStatusFilter.value
    });
     if (!crawlStatusFilter.value) params.delete('status');

    // TODO: Update API endpoint if needed, maybe /api/crawl/jobs ? or keep /api/dashboard/crawl-jobs
    const response = await fetch(`/api/dashboard/crawl-jobs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!response.ok) {
      if (response.status === 404) {
         console.warn('Crawl jobs API endpoint not found yet.');
         crawlJobsTable.innerHTML = `<tr><td colspan="6" class="text-center py-4">Feature under development. API endpoint not found.</td></tr>`;
         return;
      }
      throw new Error(`Failed to load crawl jobs: ${response.statusText}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
      state.crawlJobs.data = result.data.jobs; // Assuming API returns jobs array
      state.crawlJobs.total = result.data.pagination.total;
      renderCrawlJobsTable(state.crawlJobs.data);
      renderPagination('crawl-jobs', state.crawlJobs);
    } else {
      console.error('Error loading crawl jobs:', result.message);
      crawlJobsTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-600">Error loading jobs: ${result.message}</td></tr>`;
    }
  } catch (error) {
    console.error('Error loading crawl jobs:', error);
    crawlJobsTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-600">Error loading jobs: ${error.message}</td></tr>`;
  }
}

function renderCrawlJobsTable(jobs) {
    crawlJobsTable.innerHTML = '';
    if (jobs.length === 0) {
        crawlJobsTable.innerHTML = `<tr><td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="6">No crawl jobs found</td></tr>`;
    } else {
        jobs.forEach(job => {
          let statusClass = 'bg-gray-100 text-gray-800';
          if (job.status === 'pending') statusClass = 'bg-yellow-100 text-yellow-800';
          if (job.status === 'processing') statusClass = 'bg-blue-100 text-blue-800';
          if (job.status === 'completed') statusClass = 'bg-green-100 text-green-800';
          if (job.status === 'completed_with_errors') statusClass = 'bg-orange-100 text-orange-800';
          if (job.status === 'failed') statusClass = 'bg-red-100 text-red-800';

          crawlJobsTable.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0"><a href="${job.startUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-900">${truncateUrl(job.startUrl)}</a></td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${job.status}</span></td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${moment(job.createdAt).format('MMM D, YYYY HH:mm')}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${job.endTime ? moment(job.endTime).format('MMM D, YYYY HH:mm') : '-'}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${job.processedUrls || 0} / ${job.foundUrls || 0}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                 <button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${job.id}" data-action="view-crawl"><i class="fas fa-info-circle"></i> Details</button>
                 <button class="text-red-600 hover:text-red-900" data-id="${job.id}" data-action="delete-crawl-job"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
        });
        crawlJobsTable.querySelectorAll('[data-action="view-crawl"]').forEach(b => b.addEventListener('click', handleCrawlJobView));
        crawlJobsTable.querySelectorAll('[data-action="delete-crawl-job"]').forEach(b => b.addEventListener('click', handleCrawlJobDelete));
    }
}


// Load transformers for Transformers page
async function loadTransformers() {
  try {
    const response = await fetch('/api/dashboard/transformers', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error('Failed to load transformers');
    const result = await response.json();
    if (result.status === 'success') {
      renderTransformers(result.data.transformers);
    } else {
      console.error('Error loading transformers:', result.message);
    }
  } catch (error) {
    console.error('Error loading transformers:', error);
  }
}

function renderTransformers(transformers) {
    const transformersList = document.getElementById('transformers-list');
    transformersList.innerHTML = '';
    if (transformers.length === 0) {
        transformersList.innerHTML = '<p class="text-gray-500">No transformers available</p>';
    } else {
        transformers.forEach(transformer => {
          transformersList.innerHTML += `
            <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
              <div class="flex items-start">
                <div class="flex-shrink-0"><i class="fas fa-cogs text-indigo-600 text-xl"></i></div>
                <div class="ml-3">
                  <h3 class="text-md font-medium text-gray-900">${transformer.name}</h3>
                  <p class="mt-1 text-sm text-gray-500">${transformer.description}</p>
                </div>
              </div>
              <div class="mt-4">
                <button type="button" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-transformer="${transformer.name}">Apply</button>
              </div>
            </div>`;
        });
        transformersList.querySelectorAll('[data-transformer]').forEach(b => b.addEventListener('click', handleTransformerApply));
    }
}

// --- Page Switching ---
function switchPage(page) {
  // Clear existing refresh interval if navigating away from dashboard
  if (state.activePage === 'dashboard' && page !== 'dashboard') {
    if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = null;
    console.log('Cleared dashboard refresh interval.'); // Debug log
  }

  // Hide all pages
  pageDashboard.classList.add('hidden');
  pageScrapes.classList.add('hidden');
  pageJobs.classList.add('hidden');
  pageCrawlJobs.classList.add('hidden'); // Hide new page
  pageTransformers.classList.add('hidden');

  // Show selected page
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
      targetPage.classList.remove('hidden');
  } else {
      console.error(`Page element not found: page-${page}`);
      pageDashboard.classList.remove('hidden'); // Fallback to dashboard
      page = 'dashboard';
  }


  // Update navigation highlights
  document.querySelectorAll('#nav-dashboard, #nav-scrapes, #nav-jobs, #nav-crawl-jobs, #nav-transformers').forEach(nav => {
    nav.classList.remove('text-indigo-100', 'bg-indigo-800');
    nav.classList.add('text-white');
  });

  const activeNav = document.getElementById(`nav-${page}`);
  if (activeNav) {
    activeNav.classList.add('text-indigo-100', 'bg-indigo-800');
    activeNav.classList.remove('text-white');
  }

  // Update state
  state.activePage = page;

  // Load page-specific data
  loadDataForCurrentPage();

  // Set up refresh interval if navigating to dashboard
  if (page === 'dashboard' && !dashboardRefreshInterval) {
    dashboardRefreshInterval = setInterval(loadDashboardStats, 30000); // Refresh every 30 seconds
    console.log('Set dashboard refresh interval.'); // Debug log
  }
}

// --- UI Interaction ---
function toggleUserMenu() {
  userMenu.classList.toggle('hidden');
}

function logout() {
  // Clear refresh interval on logout
  if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
  dashboardRefreshInterval = null;

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Modals
function showNewScrapeModal() { newScrapeModal.classList.remove('hidden'); }
function hideNewScrapeModal() { newScrapeModal.classList.add('hidden'); newScrapeForm.reset(); }
function showNewCrawlModal() { newCrawlModal.classList.remove('hidden'); }
function hideNewCrawlModal() { newCrawlModal.classList.add('hidden'); newCrawlForm.reset(); }

// --- Form Submissions ---
async function submitNewScrape() {
  try {
    const url = document.getElementById('scrape-url').value;
    const category = document.getElementById('scrape-category').value;
    const notes = document.getElementById('scrape-notes').value;
    const useBrowser = document.getElementById('scrape-browser').checked;

    if (!url) { alert('Please enter a URL'); return; }

    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify({ url, category, notes, useBrowser }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to submit scrape job');

    if (result.status === 'success') {
      hideNewScrapeModal();
      alert('Scrape job submitted successfully. Track status on the Scrape Jobs page.');
      loadDataForCurrentPage();
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Error submitting scrape job:', error);
    alert(`Error: ${error.message}`);
  }
}

async function submitNewCrawl() {
  try {
    const startUrl = document.getElementById('crawl-start-url').value;
    const maxDepthInput = document.getElementById('crawl-max-depth');
    const domainScope = document.getElementById('crawl-domain-scope').value;
    const useBrowser = document.getElementById('crawl-browser').checked;

    if (!startUrl) { alert('Please enter a Start URL'); return; }

    let maxDepth = maxDepthInput.value ? parseInt(maxDepthInput.value, 10) : null;
    if (isNaN(maxDepth) || maxDepth < 0) maxDepth = null;

    const payload = { startUrl, maxDepth, domainScope, useBrowser };

    const response = await fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
     if (!response.ok) throw new Error(result.message || 'Failed to submit crawl job');

    if (result.status === 'success') {
      hideNewCrawlModal();
      alert('Crawl job submitted successfully. Track status on the Crawl Jobs page.');
      switchPage('crawl-jobs');
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Error submitting crawl job:', error);
    alert(`Error: ${error.message}`);
  }
}

// --- Action Handlers ---
async function handleScrapeAction(e) {
  const action = e.currentTarget.dataset.action;
  const id = e.currentTarget.dataset.id;

  if (action === 'view') {
    window.location.href = `/scrape/${id}`;
  } else if (action === 'favorite') {
    try {
      const isCurrentlyFavorite = e.currentTarget.querySelector('i').classList.contains('fa-star');
      const response = await fetch(`/api/dashboard/scrape/${id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
        body: JSON.stringify({ isFavorite: !isCurrentlyFavorite }),
      });
      if (!response.ok) throw new Error('Failed to update favorite status');
      loadScrapes(); // Refresh table
      if (state.activePage === 'dashboard') loadDashboardStats(); // Refresh stats if needed
    } catch (error) {
      console.error('Error updating favorite status:', error);
      alert(`Error: ${error.message}`);
    }
  } else if (action === 'delete') {
    if (confirm('Are you sure you want to delete this scrape? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/dashboard/scrape/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${state.token}` },
        });
        if (!response.ok) throw new Error('Failed to delete scrape');
        loadScrapes(); // Refresh table
        if (state.activePage === 'dashboard') { loadDashboardStats(); loadRecentScrapes(); } // Refresh stats
      } catch (error) {
        console.error('Error deleting scrape:', error);
        alert(`Error: ${error.message}`);
      }
    }
  }
}

async function handleJobRetry(e) {
  const id = e.currentTarget.dataset.id;
  try {
    // TODO: Update API endpoint if needed
    const response = await fetch(`/api/dashboard/scrape-job/${id}/retry`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    if (!response.ok) throw new Error('Failed to retry job');
    loadJobs(); // Refresh jobs table
  } catch (error) {
    console.error('Error retrying job:', error);
    alert(`Error: ${error.message}`);
  }
}

async function handleJobDelete(e) {
  const id = e.currentTarget.dataset.id;
  if (confirm('Are you sure you want to delete this job?')) {
    try {
      // TODO: Update API endpoint if needed
      const response = await fetch(`/api/dashboard/scrape-job/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.token}` },
      });
      if (!response.ok) throw new Error('Failed to delete job');
      loadJobs(); // Refresh jobs table
    } catch (error) {
      console.error('Error deleting job:', error);
      alert(`Error: ${error.message}`);
    }
  }
}

// Placeholder handlers for crawl job actions (New)
async function handleCrawlJobView(e) {
    const id = e.currentTarget.dataset.id;
    window.location.href = `/dashboard/crawl-details.html?id=${id}`;
}

// Fetch crawl job details from API
async function fetchCrawlJobDetails(jobId) {
    const response = await fetch(`/api/crawl/${jobId}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch crawl job details');
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message || 'Failed to fetch crawl job details');
    return result.data;
}

function showCrawlDetailsModal(details) {
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
            content += `<li style="margin-bottom:10px;">
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
        content += `<h3>Scraped Content (Markdown)</h3><pre style="max-height:400px;overflow:auto;background:#f9f9f9;padding:10px;">${escapeHtml(details.mcpResult.markdownData)}</pre>`;
    } else {
        content += `<p>No crawl content available.</p>`;
    }

    const modalWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    modalWindow.document.write(`<html><head><title>Crawl Job Details</title></head><body style="font-family:sans-serif;">${content}</body></html>`);
    modalWindow.document.close();
}

// Build a tree from pages with parentUrl
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
            treeRoot.children.push(node); // Orphan or root
        }
    });
    return treeRoot;
}

// Render crawl tree as nested list
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

// Escape HTML for safe display
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>');
}

async function handleCrawlJobDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm('Are you sure you want to delete this crawl job and its associated data?')) {
        try {
            // TODO: Update API endpoint if needed
            const response = await fetch(`/api/crawl/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${state.token}` },
            });
            if (!response.ok) throw new Error('Failed to delete crawl job');
            loadCrawlJobs(); // Refresh crawl jobs table
        } catch (error) {
            console.error('Error deleting crawl job:', error);
            alert(`Error: ${error.message}`);
        }
    }
}


function handleTransformerApply(e) {
  const transformer = e.currentTarget.dataset.transformer;
  alert(`Applying transformer: ${transformer}. This feature is not fully implemented yet.`);
}

// --- Helper Functions ---
function renderPagination(type, dataState) {
    const totalPages = Math.ceil(dataState.total / dataState.limit);
    const showingStart = dataState.total === 0 ? 0 : (dataState.page - 1) * dataState.limit + 1;
    const showingEnd = Math.min(dataState.page * dataState.limit, dataState.total);

    document.getElementById(`${type}-pagination-showing`).textContent = `${showingStart}-${showingEnd}`;
    document.getElementById(`${type}-pagination-total`).textContent = dataState.total;
    document.getElementById(`${type}-pagination-current`).textContent = dataState.page;

    document.getElementById(`${type}-pagination-prev`).disabled = dataState.page <= 1;
    document.getElementById(`${type}-pagination-next`).disabled = dataState.page >= totalPages;
}


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

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { timeout = null; func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
