// Extracted and enhanced forum job modal logic from dashboard index.html
// This script should be loaded ONLY on forum.html

document.addEventListener('DOMContentLoaded', function() {
  // Modal elements
  var forumBtn = document.getElementById('new-forum-job-btn');
  var forumModal = document.getElementById('forum-job-modal');
  var forumCancel = document.getElementById('forum-job-cancel-btn');
  var forumClose = document.getElementById('close-forum-job-modal');
  var forumForm = document.getElementById('forum-job-form');
  var dbType = document.getElementById('forum-output-type');
  var dbPathLabel = document.getElementById('forum-db-path-label');
  var dbPathInput = document.getElementById('forum-db-path');
  var dbCreateBtn = document.getElementById('forum-db-create-btn');
  var startUrlInput = document.getElementById('forum-start-url');
  var maxPagesInput = document.getElementById('forum-max-pages');
  
  // Helper to extract domain from input
  function extractDomain(url) {
    url = url.trim();
    if (!url) return 'site';
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    var domain = url.split('/')[0].split('?')[0].split('#')[0];
    return domain.replace(/\.$/, '');
  }
  // Get username from environment (server-side injection or fallback)
  var username = (window.osUser || 'USERNAME');
  try {
    username = window.localStorage.getItem('icecrawl_username') || username;
  } catch (e) {}
  function getDefaultDbPath(domain) {
    domain = domain || 'site';
    // Remove all dots from domain for cross-platform compatibility
    var cleanDomain = domain.replace(/\./g, '');
    var dbName = cleanDomain + '_forum.sqlite';
    if (navigator.userAgent.includes('Windows')) {
      return 'C:/Users/' + username + '/Documents/' + dbName;
    } else if (navigator.userAgent.includes('Macintosh')) {
      return '/Users/' + username + '/Documents/' + dbName;
    } else {
      return '/home/' + username + '/Documents/' + dbName;
    }
  }
  function updateDbPath() {
    var domain = extractDomain(startUrlInput.value);
    dbPathInput.value = getDefaultDbPath(domain);
  }
  if (startUrlInput) {
    startUrlInput.addEventListener('input', function() {
      updateDbPath();
    });
  }
  if (forumBtn && forumModal) {
    forumBtn.addEventListener('click', function(e) {
      e.preventDefault();
      forumModal.style.display = 'block';
      updateDbPath();
    });
  }
  if (forumCancel && forumModal) {
    forumCancel.addEventListener('click', function() {
      forumModal.style.display = 'none';
    });
  }
  if (forumClose && forumModal) {
    forumClose.addEventListener('click', function() {
      forumModal.style.display = 'none';
    });
  }
  if (dbType && dbPathLabel) {
    dbType.addEventListener('change', function() {
      dbPathLabel.style.display = dbType.value === 'sqlite' ? '' : 'none';
      updateDbPath();
    });
  }
  // --- Auto-create SQLite DB if needed on form submit ---
  if (forumForm) {
    forumForm.addEventListener('submit', async function(event) {
      // Always add maxPages before any submit
      if (maxPagesInput && maxPagesInput.value) {
        var maxPages = parseInt(maxPagesInput.value, 10);
        if (!isNaN(maxPages) && maxPages > 0) {
          var maxPagesField = document.createElement('input');
          maxPagesField.type = 'hidden';
          maxPagesField.name = 'maxPages';
          maxPagesField.value = maxPages;
          forumForm.appendChild(maxPagesField);
        }
      }

      if (dbType && dbType.value === 'sqlite') {
        event.preventDefault(); // We'll submit after DB check
        var domain = extractDomain(startUrlInput.value);
        var filePath = getDefaultDbPath(domain);
        dbPathInput.value = filePath;
        // Check if DB already exists for this domain
        try {
          const checkResp = await fetch('/api/forum/check-forum-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
          });
          const checkResult = await checkResp.json();
          if (!checkResult.exists) {
            // Create DB if not exists
            const createResp = await fetch('/api/forum/create-forum-db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath })
            });
            const createResult = await createResp.json();
            if (!createResp.ok) {
              alert(createResult.error || 'Failed to create database.');
              return;
            }
          }
        } catch (err) {
          alert('Database check/create error: ' + err);
          return;
        }
        // Now submit the form for job creation (maxPages is already appended)
        forumForm.submit();
        return;
      }
    }, true); // Use capture to run before any other submit handler
  }
  // --- Remove manual DB create button logic ---
  if (dbCreateBtn && dbPathInput) {
    dbCreateBtn.style.display = 'none';
  }
  // Close modal on outside click
  window.addEventListener('click', function(event) {
    if (event.target === forumModal) {
      forumModal.style.display = 'none';
    }
  });
});
