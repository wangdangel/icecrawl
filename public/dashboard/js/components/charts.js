/**
 * Charts Component
 * Handles chart rendering and data visualization
 */

/**
 * Chart instances cache
 */
const charts = {
  activityChart: null
};

/**
 * Create activity chart for dashboard
 * @param {Array} data - Activity data points
 */
function createActivityChart(data) {
  // Destroy existing chart if it exists
  if (charts.activityChart) {
    charts.activityChart.destroy();
  }
  
  const ctx = document.getElementById('scraping-activity-chart')?.getContext('2d');
  if (!ctx) {
    console.error('Activity chart canvas not found');
    return;
  }
  
  const labels = data.map(item => moment(item.date).format('MMM D'));
  const values = data.map(item => item.count);
  
  charts.activityChart = new Chart(ctx, {
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
          precision: 0 
        } 
      },
      plugins: {
        legend: { 
          display: false 
        },
        tooltip: { 
          callbacks: { 
            label: context => `${context.parsed.y} scrapes` 
          } 
        }
      }
    }
  });
  
  return charts.activityChart;
}

/**
 * Get chart instance
 * @param {string} chartName - Chart name
 * @returns {Object|null} Chart instance or null if not found
 */
function getChart(chartName) {
  return charts[chartName] || null;
}

/**
 * Destroy a specific chart
 * @param {string} chartName - Chart name
 */
function destroyChart(chartName) {
  if (charts[chartName]) {
    charts[chartName].destroy();
    charts[chartName] = null;
  }
}

/**
 * Destroy all charts
 */
function destroyAllCharts() {
  Object.keys(charts).forEach(chartName => {
    if (charts[chartName]) {
      charts[chartName].destroy();
      charts[chartName] = null;
    }
  });
}

export {
  createActivityChart,
  getChart,
  destroyChart,
  destroyAllCharts
};
