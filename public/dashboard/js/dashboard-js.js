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
  jobs: {
    data: [],
    page: 1,
    limit: 10,
    total: 0,
  }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  checkAuth();
  
  // Navigation
  document.getElementById('nav-dashboard').addEventListener('click', e => {
    e.preventDefault();
    switchPage('dashboard');
  });
  
  document.getElementById('nav-scrapes').addEventListener('click', e => {
    e.preventDefault();
    switchPage('scrapes');
  });
  
  document.getElementById('nav-jobs').addEventListener('click', e => {
    e.preventDefault();
    switchPage('jobs');
  });
  
  document.getElementById('nav-transformers').addEventListener('click', e => {
    e.preventDefault();
    switchPage('transformers');
  });
  
  // User menu
  document.getElementById('user-menu-button').addEventListener('click', toggleUserMenu);
  document.getElementById('user-menu-logout').addEventListener('click', logout);
  
  // New scrape button
  document.getElementById('new-scrape-button').addEventListener('click', showNewScrapeModal);
  document.getElementById('scrape-cancel').addEventListener('click', hideNewScrapeModal);
  document.getElementById('scrape-submit').addEventListener('click', submitNewScrape);
  
  // Pagination for scrapes
  document.getElementById('scrapes-pagination-prev').addEventListener('click', () => {
    if (state.scrapes.page > 1) {
      state.scrapes.page--;
      loadScrapes();
    }
  });
  
  document.getElementById('scrapes-pagination-next').addEventListener('click', () => {
    if (state.scrapes.page < Math.ceil(state.scrapes.total / state.scrapes.limit)) {
      state.scrapes.page++;
      loadScrapes();
    }
  });
  
  // Pagination for jobs
  document.getElementById('jobs-pagination-prev').addEventListener('click', () => {
    if (state.jobs.page > 1) {
      state.jobs.page--;
      loadJobs();
    }
  });
  
  document.getElementById('jobs-pagination-next').addEventListener('click', () => {
    if (state.jobs.page < Math.ceil(state.jobs.total / state.jobs.limit)) {
      state.jobs.page++;
      loadJobs();
    }
  });
  
  // View all scrapes link
  document.getElementById('view-all-scrapes').addEventListener('click', e => {
    e.preventDefault();
    switchPage('scrapes');
  });
  
  // Search input on scrapes page
  document.getElementById('search').addEventListener('input', debounce(() => {
    state.scrapes.page = 1;
    loadScrapes();
  }, 300));
  
  // Category and tag filters on scrapes page
  document.getElementById('category').addEventListener('change', () => {
    state.scrapes.page = 1;
    loadScrapes();
  });
  
  document.getElementById('tag').addEventListener('change', () => {
    state.scrapes.page = 1;
    loadScrapes();
  });
  
  // Status filter on jobs page
  document.getElementById('status-filter').addEventListener('change', () => {
    state.jobs.page = 1;
    loadJobs();
  });
});

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    state.token = token;
    state.user = JSON.parse(user);
    
    // Set user initials
    const userInitials = state.user.username.substring(0, 2).toUpperCase();
    document.getElementById('user-initials').textContent = userInitials;
    
    // Load data
    loadDashboardData();
  } else {
    // Redirect to login page
    window.location.href = '/login';
  }
}

// Load dashboard data
function loadDashboardData() {
  // Show active page
  switchPage(state.activePage);
  
  // Load page-specific data
  if (state.activePage === 'dashboard') {
    loadDashboardStats();
    loadRecentScrapes();
  } else if (state.activePage === 'scrapes') {
    loadScrapes();
    loadTags(); // Load tags for filter
  } else if (state.activePage === 'jobs') {
    loadJobs();
  } else if (state.activePage === 'transformers') {
    loadTransformers();
  }
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch('/api/dashboard/statistics', {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load dashboard statistics');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // Update statistics
      document.getElementById('stat-total-scrapes').textContent = result.data.totalScrapes;
      document.getElementById('stat-favorites').textContent = result.data.totalFavorites;
      
      // Pending and failed jobs stats
      const pendingJobs = result.data.jobStats?.pending || 0;
      const failedJobs = result.data.jobStats?.failed || 0;
      document.getElementById('stat-pending-jobs').textContent = pendingJobs;
      document.getElementById('stat-failed-jobs').textContent = failedJobs;
      
      // Create activity chart
      createActivityChart(result.data.scrapesByDay);
      
      // Update top domains table
      const topDomainsTable = document.getElementById('top-domains-table');
      topDomainsTable.innerHTML = '';
      
      if (result.data.topDomains.length === 0) {
        topDomainsTable.innerHTML = `
          <tr>
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="2">No data available</td>
          </tr>
        `;
      } else {
        result.data.topDomains.forEach(domain => {
          topDomainsTable.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">${domain.domain}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${domain.count}</td>
            </tr>
          `;
        });
      }
    } else {
      console.error('Error loading dashboard statistics:', result.message);
    }
  } catch (error) {
    console.error('Error loading dashboard statistics:', error);
  }
}

// Create activity chart
function createActivityChart(data) {
  const ctx = document.getElementById('scraping-activity-chart').getContext('2d');
  
  // Format dates and prepare data
  const labels = [];
  const values = [];
  
  data.forEach(item => {
    labels.push(moment(item.date).format('MMM D'));
    values.push(item.count);
  });
  
  // Create chart
  new Chart(ctx, {
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
      scales: {
        y: {
          beginAtZero: true,
          precision: 0,
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              return `${context.parsed.y} scrapes`;
            }
          }
        }
      }
    }
  });
}

// Load recent scrapes
async function loadRecentScrapes() {
  try {
    const response = await fetch('/api/dashboard/recent-scrapes?limit=5', {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load recent scrapes');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const scrapes = result.data.scrapes;
      const table = document.getElementById('recent-scrapes-table');
      table.innerHTML = '';
      
      if (scrapes.length === 0) {
        table.innerHTML = `
          <tr>
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="2">No scrapes found</td>
          </tr>
        `;
      } else {
        scrapes.forEach(scrape => {
          table.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                <a href="/scrape/${scrape.id}" class="text-indigo-600 hover:text-indigo-900">${scrape.title || 'Untitled'}</a>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${moment(scrape.createdAt).fromNow()}</td>
            </tr>
          `;
        });
      }
    } else {
      console.error('Error loading recent scrapes:', result.message);
    }
  } catch (error) {
    console.error('Error loading recent scrapes:', error);
  }
}

// Load scrapes for My Scrapes page
async function loadScrapes() {
  try {
    // Get filters
    const search = document.getElementById('search').value;
    const category = document.getElementById('category').value;
    const tag = document.getElementById('tag').value;
    
    // Build query params
    const params = new URLSearchParams({
      page: state.scrapes.page,
      limit: state.scrapes.limit
    });
    
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (tag) params.append('tag', tag);
    
    const response = await fetch(`/api/dashboard/scrapes?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load scrapes');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      state.scrapes.data = result.data.scrapes;
      state.scrapes.total = result.data.pagination.total;
      
      // Update table
      const table = document.getElementById('scrapes-table');
      table.innerHTML = '';
      
      if (state.scrapes.data.length === 0) {
        table.innerHTML = `
          <tr>
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="5">No scrapes found</td>
          </tr>
        `;
      } else {
        state.scrapes.data.forEach(scrape => {
          table.innerHTML += `
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
            </tr>
          `;
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('[data-action]').forEach(button => {
          button.addEventListener('click', handleScrapeAction);
        });
      }
      
      // Update pagination
      document.getElementById('scrapes-pagination-showing').textContent = 
        `${(state.scrapes.page - 1) * state.scrapes.limit + 1}-${Math.min(state.scrapes.page * state.scrapes.limit, state.scrapes.total)}`;
      document.getElementById('scrapes-pagination-total').textContent = state.scrapes.total;
      document.getElementById('scrapes-pagination-current').textContent = state.scrapes.page;
      
      // Enable/disable pagination buttons
      document.getElementById('scrapes-pagination-prev').disabled = state.scrapes.page <= 1;
      document.getElementById('scrapes-pagination-next').disabled = 
        state.scrapes.page >= Math.ceil(state.scrapes.total / state.scrapes.limit);
    } else {
      console.error('Error loading scrapes:', result.message);
    }
  } catch (error) {
    console.error('Error loading scrapes:', error);
  }
}

// Load tags for filter
async function loadTags() {
  try {
    const response = await fetch('/api/dashboard/tags', {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load tags');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const tags = result.data.tags;
      const tagSelect = document.getElementById('tag');
      
      // Clear existing options (except the first one)
      while (tagSelect.options.length > 1) {
        tagSelect.remove(1);
      }
      
      // Add tags
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
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

// Load jobs for Jobs page
async function loadJobs() {
  try {
    // Get status filter
    const statusFilter = document.getElementById('status-filter').value;
    
    // Build query params
    const params = new URLSearchParams({
      page: state.jobs.page,
      limit: state.jobs.limit
    });
    
    if (statusFilter) params.append('status', statusFilter);
    
    const response = await fetch(`/api/dashboard/scrape-jobs?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load jobs');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      state.jobs.data = result.data.jobs;
      state.jobs.total = result.data.pagination.total;
      
      // Update table
      const table = document.getElementById('jobs-table');
      table.innerHTML = '';
      
      if (state.jobs.data.length === 0) {
        table.innerHTML = `
          <tr>
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0" colspan="5">No jobs found</td>
          </tr>
        `;
      } else {
        state.jobs.data.forEach(job => {
          // Determine status class
          let statusClass = 'bg-gray-100 text-gray-800'; // Default
          if (job.status === 'pending') statusClass = 'bg-yellow-100 text-yellow-800';
          if (job.status === 'processing') statusClass = 'bg-blue-100 text-blue-800';
          if (job.status === 'completed') statusClass = 'bg-green-100 text-green-800';
          if (job.status === 'failed') statusClass = 'bg-red-100 text-red-800';
          
          table.innerHTML += `
            <tr>
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                <a href="${job.url}" target="_blank" class="text-indigo-600 hover:text-indigo-900">${truncateUrl(job.url)}</a>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                  ${job.status}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${moment(job.createdAt).format('MMM D, YYYY HH:mm')}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${job.endTime ? moment(job.endTime).format('MMM D, YYYY HH:mm') : '-'}</td>
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
            </tr>
          `;
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('[data-action="retry"]').forEach(button => {
          button.addEventListener('click', handleJobRetry);
        });
        
        document.querySelectorAll('[data-action="delete-job"]').forEach(button => {
          button.addEventListener('click', handleJobDelete);
        });
      }
      
      // Update pagination
      document.getElementById('jobs-pagination-showing').textContent = 
        `${(state.jobs.page - 1) * state.jobs.limit + 1}-${Math.min(state.jobs.page * state.jobs.limit, state.jobs.total)}`;
      document.getElementById('jobs-pagination-total').textContent = state.jobs.total;
      document.getElementById('jobs-pagination-current').textContent = state.jobs.page;
      
      // Enable/disable pagination buttons
      document.getElementById('jobs-pagination-prev').disabled = state.jobs.page <= 1;
      document.getElementById('jobs-pagination-next').disabled = 
        state.jobs.page >= Math.ceil(state.jobs.total / state.jobs.limit);
    } else {
      console.error('Error loading jobs:', result.message);
    }
  } catch (error) {
    console.error('Error loading jobs:', error);
  }
}

// Load transformers for Transformers page
async function loadTransformers() {
  try {
    const response = await fetch('/api/dashboard/transformers', {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load transformers');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const transformers = result.data.transformers;
      const transformersList = document.getElementById('transformers-list');
      transformersList.innerHTML = '';
      
      if (transformers.length === 0) {
        transformersList.innerHTML = '<p class="text-gray-500">No transformers available</p>';
      } else {
        transformers.forEach(transformer => {
          transformersList.innerHTML += `
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
            </div>
          `;
        });
        
        // Add event listeners
        document.querySelectorAll('[data-transformer]').forEach(button => {
          button.addEventListener('click', handleTransformerApply);
        });
      }
    } else {
      console.error('Error loading transformers:', result.message);
    }
  } catch (error) {
    console.error('Error loading transformers:', error);
  }
}

// Switch between pages
function switchPage(page) {
  // Hide all pages
  document.getElementById('page-dashboard').classList.add('hidden');
  document.getElementById('page-scrapes').classList.add('hidden');
  document.getElementById('page-jobs').classList.add('hidden');
  document.getElementById('page-transformers').classList.add('hidden');
  
  // Show selected page
  document.getElementById(`page-${page}`).classList.remove('hidden');
  
  // Update navigation
  document.querySelectorAll('#nav-dashboard, #nav-scrapes, #nav-jobs, #nav-transformers').forEach(nav => {
    nav.classList.remove('text-indigo-100', 'bg-indigo-800');
    nav.classList.add('text-white');
  });
  
  document.getElementById(`nav-${page}`).classList.add('text-indigo-100', 'bg-indigo-800');
  document.getElementById(`nav-${page}`).classList.remove('text-white');
  
  // Update state
  state.activePage = page;
  
  // Load page-specific data
  if (page === 'dashboard') {
    loadDashboardStats();
    loadRecentScrapes();
  } else if (page === 'scrapes') {
    loadScrapes();
    loadTags();
  } else if (page === 'jobs') {
    loadJobs();
  } else if (page === 'transformers') {
    loadTransformers();
  }
}

// Toggle user menu
function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  menu.classList.toggle('hidden');
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Show new scrape modal
function showNewScrapeModal() {
  document.getElementById('new-scrape-modal').classList.remove('hidden');
}

// Hide new scrape modal
function hideNewScrapeModal() {
  document.getElementById('new-scrape-modal').classList.add('hidden');
  document.getElementById('new-scrape-form').reset();
}

// Submit new scrape
async function submitNewScrape() {
  try {
    const url = document.getElementById('scrape-url').value;
    const category = document.getElementById('scrape-category').value;
    const notes = document.getElementById('scrape-notes').value;
    const useBrowser = document.getElementById('scrape-browser').checked;
    
    if (!url) {
      alert('Please enter a URL');
      return;
    }
    
    // Submit form
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        url,
        category,
        notes,
        useBrowser,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit scrape job');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      hideNewScrapeModal();
      
      // Show success message
      alert('Scrape job submitted successfully');
      
      // Refresh data
      if (state.activePage === 'dashboard') {
        loadDashboardStats();
        loadRecentScrapes();
      } else if (state.activePage === 'jobs') {
        loadJobs();
      }
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Error submitting scrape job:', error);
    alert(`Error: ${error.message}`);
  }
}

// Handle scrape actions (view, favorite, delete)
async function handleScrapeAction(e) {
  const action = e.currentTarget.dataset.action;
  const id = e.currentTarget.dataset.id;
  
  if (action === 'view') {
    // Navigate to scrape details page
    window.location.href = `/scrape/${id}`;
  } else if (action === 'favorite') {
    try {
      const response = await fetch(`/api/dashboard/scrape/${id}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
          isFavorite: !e.currentTarget.querySelector('i').classList.contains('fa-star'),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      // Refresh scrapes
      loadScrapes();
      
      // Refresh dashboard stats if on dashboard
      if (state.activePage === 'dashboard') {
        loadDashboardStats();
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      alert(`Error: ${error.message}`);
    }
  } else if (action === 'delete') {
    if (confirm('Are you sure you want to delete this scrape? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/dashboard/scrape/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${state.token}`
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete scrape');
        }
        
        // Refresh scrapes
        loadScrapes();
        
        // Refresh dashboard stats if on dashboard
        if (state.activePage === 'dashboard') {
          loadDashboardStats();
          loadRecentScrapes();
        }
      } catch (error) {
        console.error('Error deleting scrape:', error);
        alert(`Error: ${error.message}`);
      }
    }
  }
}

// Handle job retry
async function handleJobRetry(e) {
  const id = e.currentTarget.dataset.id;
  
  try {
    const response = await fetch(`/api/dashboard/scrape-job/${id}/retry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to retry job');
    }
    
    // Refresh jobs
    loadJobs();
  } catch (error) {
    console.error('Error retrying job:', error);
    alert(`Error: ${error.message}`);
  }
}

// Handle job delete
async function handleJobDelete(e) {
  const id = e.currentTarget.dataset.id;
  
  if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
    try {
      const response = await fetch(`/api/dashboard/scrape-job/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${state.token}`
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete job');
      }
      
      // Refresh jobs
      loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert(`Error: ${error.message}`);
    }
  }
}

// Handle transformer apply
function handleTransformerApply(e) {
  const transformer = e.currentTarget.dataset.transformer;
  alert(`Applying transformer: ${transformer}. This feature is not fully implemented yet.`);
}

// Helper functions
// ===============================================

// Truncate URL for display
function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const path = urlObj.pathname;
    
    // Shorten path if too long
    const shortenedPath = path.length > 20 ? path.substring(0, 17) + '...' : path;
    
    return `${host}${shortenedPath}`;
  } catch (e) {
    // If invalid URL, just return the original
    return url.length > 40 ? url.substring(0, 37) + '...' : url;
  }
}

// Debounce function for handling frequent events
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
