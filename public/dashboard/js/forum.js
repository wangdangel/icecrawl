// forum.js - Handles forum job UI logic

document.addEventListener('DOMContentLoaded', () => {
  // Navigation highlight
  if (window.setActiveNav) setActiveNav('forum');

  // Elements
  const jobsTable = document.getElementById('forum-jobs-table');
  const readerModal = document.getElementById('forum-reader-modal');
  const readerContent = document.getElementById('forum-reader-content');
  const closeReaderModal = document.getElementById('close-forum-reader-modal');
  const newJobBtn = document.getElementById('new-forum-job-btn');
  const jobModal = document.getElementById('forum-job-modal');
  const closeJobModal = document.getElementById('close-forum-job-modal');
  const jobForm = document.getElementById('forum-job-form');
  const outputType = document.getElementById('forum-output-type');
  const dbPathLabel = document.getElementById('forum-db-path-label');
  const dbPathInput = document.getElementById('forum-db-path');

  // Show/hide SQLite path
  outputType.addEventListener('change', () => {
    dbPathLabel.style.display = outputType.value === 'sqlite' ? '' : 'none';
  });

  // Modal controls
  newJobBtn.onclick = () => { jobModal.style.display = 'block'; };
  closeJobModal.onclick = () => { jobModal.style.display = 'none'; };
  closeReaderModal.onclick = () => { readerModal.style.display = 'none'; };

  // Close modals on outside click
  window.onclick = (event) => {
    if (event.target === jobModal) jobModal.style.display = 'none';
    if (event.target === readerModal) readerModal.style.display = 'none';
  };

  // Load jobs
  async function loadJobs() {
    jobsTable.innerHTML = `<thead><tr>
      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start URL</th>
      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Output</th>
      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Database File</th>
      <th class="px-4 py-2"></th>
    </tr></thead><tbody>`;
    try {
      const jobs = await fetch('/api/forum/jobs', {
        headers: { 'Authorization': 'Bearer ' + AuthService.getToken() }
      }).then(r => r.json());
      console.log('Raw jobs from backend:', jobs);
      // Deduplicate jobs by jobId (keep only latest by createdAt)
      const deduped = Object.values(jobs.reduce((acc, job) => {
        if (!acc[job.id] || new Date(job.createdAt) > new Date(acc[job.id].createdAt)) {
          acc[job.id] = job;
        }
        return acc;
      }, {}));
      console.log('Deduped jobs:', deduped);
      if (!deduped.length) {
        jobsTable.innerHTML += `<tr><td colspan="6" class="text-center text-gray-400 py-8">No forum jobs found.</td></tr>`;
        return;
      }
      deduped.forEach(job => {
        jobsTable.innerHTML += `<tr>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">${job.project || '-'}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-indigo-700">${escapeHtml(job.startUrl)}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm"><span class="inline-block rounded px-2 py-1 ${job.status === 'completed' ? 'bg-green-100 text-green-800' : job.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">${job.status}</span></td>
          <td class="whitespace-nowrap px-3 py-4 text-sm">${escapeHtml(job.output || '')}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm">${job.dbFile ? escapeHtml(job.dbFile) : '<span class="text-gray-400">default</span>'}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm">
            <button class="text-indigo-600 hover:text-indigo-900 mr-2" data-id="${job.id}" data-action="open"><i class="fas fa-book-open"></i> Open</button>
            <button class="text-yellow-600 hover:text-yellow-900 mr-2" data-id="${job.id}" data-action="cancel"><i class="fas fa-ban"></i> Cancel</button>
            <button class="text-red-600 hover:text-red-900" data-id="${job.id}" data-action="delete"><i class="fas fa-trash"></i> Delete</button>
          </td>
        </tr>`;
      });
      // Attach event listeners for delete buttons
      jobsTable.querySelectorAll('button[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async function() {
          const jobId = btn.getAttribute('data-id');
          if (!jobId) return;
          // First, cancel the job on the backend (correct endpoint)
          try {
            await fetch(`/api/crawl/${jobId}/cancel`, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + AuthService.getToken() }
            });
          } catch (err) {
            // Ignore error if already cancelled
          }
          // Then, delete the job
          try {
            const res = await fetch(`/api/forum/jobs/${jobId}`, {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + AuthService.getToken() }
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove forum job');
            loadJobs();
          } catch (err) {
            alert('Error removing forum job: ' + (err && err.message ? err.message : err));
          }
        });
      });
      // Add listeners for open, cancel, and remove
      jobsTable.querySelectorAll('[data-action="open"]').forEach(btn => {
        btn.addEventListener('click', e => {
          const jobId = btn.getAttribute('data-id');
          if (jobId) openReader(jobId);
        });
      });
      jobsTable.querySelectorAll('[data-action="cancel"]').forEach(btn => {
        btn.addEventListener('click', async e => {
          const jobId = btn.getAttribute('data-id');
          if (!jobId) return;
          if (!confirm('Cancel this forum job?')) return;
          try {
            const res = await fetch(`/api/crawl/${jobId}/cancel`, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + AuthService.getToken() }
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to cancel forum job');
            loadJobs();
          } catch (err) {
            alert('Error cancelling forum job: ' + (err && err.message ? err.message : err));
          }
        });
      });
    } catch (err) {
      jobsTable.innerHTML += `<tr><td colspan="6" class="text-center text-red-500 py-8">Failed to load forum jobs.</td></tr>`;
    }
  }

  // Reader modal for forum project
  async function openReader(jobId) {
    readerContent.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-indigo-600"></i></div>';
    readerModal.style.display = 'block';
    try {
      const posts = await fetch(`/api/forum/posts?jobId=${jobId}`, {
        headers: {
          'Authorization': 'Bearer ' + AuthService.getToken()
        }
      }).then(r => r.json());
      if (!posts.length) {
        readerContent.innerHTML = '<div class="text-center text-gray-500">No posts found for this project.</div>';
        return;
      }
      // Render posts in a card grid
      readerContent.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${posts.map(post => `
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="text-lg font-semibold text-indigo-700 mb-2">${escapeHtml(post.title)}</h3>
            <div class="text-gray-800 mb-2 whitespace-pre-line">${escapeHtml(post.content)}</div>
            <div class="text-xs text-gray-500 mb-1">URL: <a href="${escapeHtml(post.url)}" target="_blank" class="text-indigo-500 underline">${escapeHtml(post.url)}</a></div>
            <div class="text-xs text-gray-400">Meta: ${escapeHtml(post.meta)}</div>
          </div>
        `).join('')}
      </div>`;
    } catch (err) {
      console.error('jobs', err);
      readerContent.innerHTML = '<div class="text-center text-gray-500">Failed to load posts.</div>';
    }
  }

  // Simple HTML escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // New Forum Job button in dashboard nav
  const dashboardForumBtn = document.getElementById('new-forum-job-btn');
  if (dashboardForumBtn && window.location.pathname.endsWith('index.html')) {
    dashboardForumBtn.onclick = () => {
      window.location.href = '/dashboard/forum.html?new=1';
    };
  }

  // Open new job modal if ?new=1 in URL
  if (window.location.search.includes('new=1')) {
    setTimeout(() => { jobModal.style.display = 'block'; }, 200);
    // Remove the query param from the URL so it doesn't reopen again
    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }

  // Handle new forum job submission
  const forumJobModal = document.getElementById('forum-job-modal') || document.getElementById('new-forum-job-modal');
  const forumJobForm = forumJobModal ? forumJobModal.querySelector('form') : null;
  const forumJobSubmitBtn = forumJobModal ? forumJobModal.querySelector('button[type="submit"]') : null;

  if (forumJobForm && forumJobSubmitBtn) {
    forumJobForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const title = 'Forum Job: ' + (document.getElementById('forum-start-url').value || '').replace(/^https?:\/\//, '').split(/[/?#]/)[0];
      const startUrl = document.getElementById('forum-start-url').value.trim();
      const postSelector = document.getElementById('forum-post-selector').value.trim();
      const nextPageSelector = document.getElementById('forum-next-page-selector').value.trim();
      const nextPageText = document.getElementById('forum-next-page-text').value.trim();
      const output = document.getElementById('forum-output-type').value;
      const filePath = output === 'sqlite' ? document.getElementById('forum-db-path').value.trim() : undefined;
      const maxPagesInput = document.getElementById('forum-max-pages');
      let maxPages = undefined;
      if (maxPagesInput && maxPagesInput.value.trim() !== '') {
        const parsed = parseInt(maxPagesInput.value.trim(), 10);
        if (!isNaN(parsed) && parsed > 0) {
          maxPages = parsed;
        }
      }
      if (!title || !startUrl || !postSelector) {
        alert('Title, Start URL, and Post Selector are required.');
        return;
      }
      const payload = {
        title,
        startUrl,
        postSelector,
        nextPageSelector,
        nextPageText,
        output,
        filePath
      };
      if (maxPages !== undefined) payload.maxPages = maxPages;
      try {
        const res = await fetch('/api/forum/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AuthService.getToken()
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create forum job');
        forumJobModal.classList.add('hidden');
        if (typeof loadJobs === 'function') loadJobs();
        alert('Forum job created successfully!');
      } catch (err) {
        console.error('jobs', err);
        alert('Error creating forum job: ' + err.message);
      }
    });
  }

  // Initial load
  loadJobs();
});
