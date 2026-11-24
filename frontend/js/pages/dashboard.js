/* My dashboard (normal users): my totals from GET /dashboard/me and my next events.
   Admins have their own dashboard in admin/dashboard.html. */
$(function () {
  if (!Auth.requireLogin()) return;

  // Admins are sent to the admin dashboard instead
  if (Auth.isAdmin()) {
    location.replace('admin/dashboard.html');
    return;
  }
  Layout.init();

  $('#welcome').text('Welcome, ' + Auth.user().full_name);

  // Postgres COUNT comes back as text ("12"), so turn it into a number
  function num(value) {
    return Number(value) || 0;
  }

  function card(label, value, detail, link, linkText) {
    return `
      <div class="flex flex-col rounded-lg border border-gray-200 bg-white p-5">
        <p class="text-sm text-muted">${label}</p>
        <p class="mt-1 text-3xl font-bold">${value}</p>
        ${detail ? `<p class="mt-1 text-sm text-muted">${detail}</p>` : ''}
        <a href="${link}" class="mt-auto pt-3 text-sm font-semibold text-brand underline">${linkText}</a>
      </div>`;
  }

  // registrations: my registrations list, notifications: my notifications list
  function renderStats(stats, registrations, notifications) {
    const upcoming = registrations.filter(r => r.status === 'registered' && !EventActions.isPast(r)).length;
    // so count unread the same way the bell does: from what was opened in this browser
    const unread = notifications.filter(n => !Layout.isRead(n.id)).length;

    $('#stats').html(`
      <div class="grid gap-4 sm:grid-cols-3">
        ${card('Event registrations', num(stats.registrations.total_registered_events),
               `${upcoming} upcoming`, 'my-registrations.html', 'See my registrations')}
        ${card('Feedback given', num(stats.feedbacks.total_feedbacks),
               'Ratings you left on events', 'events.html?when=past', 'Rate past events')}
        ${card('Notifications', num(stats.notifications.total_notifications),
               `${unread} unread`, 'notifications.html', 'Open notifications')}
      </div>`);
  }

  // The 3 soonest upcoming events I am registered for
  function renderNextEvents(registrations) {
    const next = registrations
      .filter(r => r.status === 'registered' && !EventActions.isPast(r))
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 3);

    if (next.length === 0) {
      $('#next-events').html(`
        ${UI.empty('No upcoming events', 'Find an event you like and register for it.')}
        <p class="mt-3 text-center"><a href="events.html" class="text-brand underline">Browse events</a></p>`);
      return;
    }

    $('#next-events').html(`<ul class="divide-y divide-gray-100">${next.map(r => `
      <li class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div>
          <p class="font-semibold">${Utils.esc(r.title)}</p>
          <p class="text-sm text-muted">${Utils.formatDate(r.starts_at)} · ${Utils.esc(r.location || '')}</p>
        </div>
        <a href="event.html?id=${r.event_id}" aria-label="View ${Utils.esc(r.title)}"
           class="rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">View</a>
      </li>`).join('')}</ul>`);
  }

  function load() {
    const button = $('#refresh-btn');
    UI.loading(button, true);
    $('#stats').html(`<div class="grid gap-4 sm:grid-cols-3">${UI.skeleton(3)}</div>`);
    $('#next-events').html('<p class="text-sm text-muted">Loading...</p>');

    // Load the totals, my registrations and my notifications at the same time
    $.when(
      Api.get('/dashboard/me'),
      Api.get('/event-registrations/my-registrations'),
      Api.get('/notifications')
    )
      .then(function (statsRes, registrationsRes, notificationsRes) {
        renderStats(statsRes.data, registrationsRes.data, notificationsRes.data);
        renderNextEvents(registrationsRes.data);
        $('#updated-at').text('Updated at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      })
      .fail(function (err) {
        UI.error('#stats', err.message, load);
        $('#next-events').empty();
      })
      .always(function () {
        UI.loading(button, false);
      });
  }

  $('#refresh-btn').on('click', load);
  load();
});
