/* One notification: full message, a link to what it is about, and Delete for admins.
   Opening it marks it as read. */
$(function () {
  if (!Auth.requireLogin()) return;

  const id = Utils.qs('id');
  if (id) Layout.markRead(id);   // before Layout.init(), so the bell count already leaves it out
  Layout.init();

  function notFound() {
    $('#notification').html(UI.notFound('Notification not found', 'It may have been deleted. Go back to your notifications.'));
  }

  // The backend saves the id of the related item in metadata
  function relatedLink(n) {
    const m = n.metadata || {};
    const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark';
    if (m.event_id)        return `<a href="event.html?id=${Utils.esc(m.event_id)}" class="${button}">View the event</a>`;
    if (m.announcement_id) return `<a href="announcement.html?id=${Utils.esc(m.announcement_id)}" class="${button}">Listen to the announcement</a>`;
    if (m.promo_id)        return `<a href="promo.html?id=${Utils.esc(m.promo_id)}" class="${button}">Watch the promo</a>`;
    return '';
  }

  function show(n) {
    document.title = n.title + ', CivicEvents+';
    $('#notification').html(`
      <article class="rounded-lg border border-gray-200 bg-white p-6">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">${Utils.esc(CONFIG.NOTIFICATION_TYPES[n.type] || 'Notice')}</p>
        <h1 class="mt-1 text-2xl font-bold">${Utils.esc(n.title)}</h1>
        <p class="mt-1 text-sm text-muted"><time datetime="${Utils.esc(n.created_at)}">${Utils.formatDate(n.created_at)}</time></p>
        <p class="mt-4">${Utils.esc(n.message)}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          ${relatedLink(n)}
          ${Auth.isAdmin() ? `<button type="button" id="delete-btn"
             class="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">Delete</button>` : ''}
        </div>
      </article>`);
  }

  function load() {
    $('#notification').html(UI.skeleton(1));
    Api.get('/notifications/' + id)
      .then(function (res) {
        const n = res.data;
        // ROLE GUARD (UI only): the API returns any notification by id, so a normal user
        // only sees ones sent to everyone (recipient_id is null) or to them.
        if (!Auth.isAdmin() && n.recipient_id && n.recipient_id !== Auth.user().id) return notFound();
        show(n);
      })
      .fail(function (err) {
        if (err.status === 404) notFound();
        else UI.error('#notification', err.message, load);
      });
  }

  $('#main').on('click', '#delete-btn', function () {
    UI.confirm('Delete this notification?', 'It will be removed for every user. This cannot be undone.', function () {
      Api.del('/notifications/' + id)
        .then(function () { location.href = 'notifications.html?deleted=1'; })
        .fail(function (err) { UI.toast(err.message, 'error'); });
    });
  });

  if (id) load();
  else notFound();
});
