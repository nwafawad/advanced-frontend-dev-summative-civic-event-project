/* Promos list: video cards with a first-frame thumbnail.
   Normal users only see published promos. Admins also see drafts. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  Auth.applyRoleVisibility();   // removes "New promo" for normal users

  /* CACHE: the list is kept in sessionStorage for 5 minutes so moving between pages
     does not download it again. promo.js and promo-form.js clear it after admin changes. */
  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CONFIG.PROMOS_CACHE_KEY));
      if (cached && Date.now() - cached.savedAt < 5 * 60 * 1000) return cached.promos;
    } catch (e) { /* broken cache: ignore it */ }
    return null;
  }

  function saveCache(promos) {
    try {
      sessionStorage.setItem(CONFIG.PROMOS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), promos: promos }));
    } catch (e) { /* storage blocked or full: skip caching */ }
  }

  function card(promo) {
    const title = Utils.esc(promo.title);
    const description = promo.description || '';
    const short = description.length > 100 ? description.slice(0, 100) + '...' : description;
    return `
      <article class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <video data-src="${Utils.esc(promo.video_url)}#t=0.5" preload="metadata" muted playsinline aria-hidden="true"
               class="aspect-video w-full bg-gray-200 object-cover"></video>
        <div class="flex flex-1 flex-col p-4">
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-semibold">${title}</h2>
            ${promo.published ? '' : '<span class="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">Draft</span>'}
          </div>
          ${short ? `<p class="mt-1 text-sm text-muted">${Utils.esc(short)}</p>` : ''}
          <div class="mt-auto flex flex-wrap gap-2 pt-4">
            <a href="promo.html?id=${promo.id}" aria-label="Play ${title}"
               class="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">Play</a>
            ${Auth.isAdmin() ? `<a href="promo-form.html?id=${promo.id}" aria-label="Edit ${title}"
               class="rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">Edit</a>` : ''}
          </div>
        </div>
      </article>`;
  }

  // LAZY LOADING: a thumbnail video only loads when its card scrolls into view
  function lazyLoadThumbnails() {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.src = entry.target.dataset.src;
          observer.unobserve(entry.target);
        }
      });
    });
    $('#promo-list video').each(function () { observer.observe(this); });
  }

  function render(promos) {
    const visible = promos.filter(p => Auth.isAdmin() || p.published);
    if (visible.length === 0) {
      $('#promo-list').html(`<div class="sm:col-span-2 lg:col-span-3">
        ${UI.empty('No promos yet', 'New promo videos will appear here.')}</div>`);
      return;
    }
    $('#promo-list').html(visible.map(card).join(''));
    lazyLoadThumbnails();
  }

  function load() {
    const cached = readCache();
    if (cached) return render(cached);

    $('#promo-list').html(UI.skeleton(3));
    Api.get('/promos?limit=100')
      .then(function (res) {
        saveCache(res.data);
        render(res.data);
      })
      .fail(function (err) {
        UI.error('#promo-list', err.message, load);
      });
  }

  if (Utils.qs('deleted')) UI.toast('Promo deleted.');
  load();
});