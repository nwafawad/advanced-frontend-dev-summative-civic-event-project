const Utils = {
  // Escape HTML characters in a string to prevent XSS.
  esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  qs(name) { return new URLSearchParams(location.search).get(name); },
  formatDate(iso) {
    return iso ? new Date(iso).toLocaleString(undefined,
      { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  },
  timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' minutes ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hours ago';
    return Math.floor(s / 86400) + ' days ago';
  },
  formatDuration(sec) {
    if (!isFinite(sec)) return '0:00';
    return Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
  },
  debounce(callback, delay = 250) {
  let timer;

  return function (...args) {
    clearTimeout(timer);

    timer = setTimeout(function () {
      callback(...args);
    }, delay);
  };
  },

  validateFile(file, kind) {
  const rule = CONFIG.UPLOAD_LIMITS[kind];

  const extension = file.name.split('.').pop().toLowerCase();

  if (!rule.exts.includes(extension)) {
    return `Only ${rule.exts.join(', ').toUpperCase()} files are allowed.`;
  }

  const maxSizeBytes = rule.maxMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File is too large. Maximum is ${rule.maxMB} MB.`;
  }

  return null;
},
// Returns the path to a page file, relative to the current page.
  page(fileName) {
    const path = location.pathname;
    if (path.includes('/pages/admin/')) return '../' + fileName;
    if (path.includes('/pages/'))       return fileName;
    return 'pages/' + fileName;        // index.html
  },
};
