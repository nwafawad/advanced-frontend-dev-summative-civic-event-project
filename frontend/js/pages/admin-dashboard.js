/* Admin dashboard: totals from GET /dashboard/admin and a "new users per month" chart.
   The chart is plain HTML bars (no chart library) with a table for screen readers. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  if (!Auth.requireAdmin()) return;   // ROLE GUARD 2: normal users see "no access"
  Layout.adminSidebar();

  // Postgres COUNT comes back as text ("12"), so turn it into a number
  function num(value) {
    return Number(value) || 0;
  }

  function card(label, value, detail) {
    return `
      <div class="rounded-lg border border-gray-200 bg-white p-5">
        <p class="text-sm text-muted">${label}</p>
        <p class="mt-1 text-3xl font-bold">${value}</p>
        ${detail ? `<p class="mt-1 text-sm text-muted">${detail}</p>` : ''}
      </div>`;
  }

  function renderStats(d) {
    $('#stats').html(`
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${card('Users', num(d.users.total_users), `${num(d.users.active_users)} active, ${num(d.users.inactive_users)} disabled`)}
        ${card('Events', num(d.events.total_events), `${num(d.events.upcoming_events)} upcoming, ${num(d.events.past_events)} past`)}
        ${card('Registrations', num(d.registrations.total_registrations), 'Including cancelled')}
      </div>
      <div class="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        ${card('Feedback', num(d.feedbacks.total_feedback))}
        ${card('Announcements', num(d.announcements.total_announcements))}
        ${card('Promos', num(d.promos.total_promos))}
        ${card('Notifications', num(d.notifications.total_notifications))}
      </div>`);
  }

  // The API leaves out months with no sign-ups, so build the last 6 months and fill the gaps with 0
  function lastSixMonths(growth) {
    const counts = {};
    growth.forEach(function (row) { counts[row.month] = num(row.new_users); });

    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');   // "2026-11"
      months.push({
        short: date.toLocaleString(undefined, { month: 'short' }),                   // "Nov"
        long: date.toLocaleString(undefined, { month: 'long', year: 'numeric' }),    // "November 2026"
        count: counts[key] || 0,
      });
    }
    return months;
  }

  function renderChart(months) {
    const max = Math.max(1, ...months.map(m => m.count));
    const total = months.reduce((sum, m) => sum + m.count, 0);

    // Each bar is up to 160px tall
    const bars = months.map(m => `
      <div class="flex flex-1 flex-col items-center gap-1">
        <span class="text-sm font-semibold">${m.count}</span>
        <div class="w-full max-w-[3rem] rounded-t bg-brand" style="height: ${Math.round(m.count / max * 160)}px"></div>
        <span class="text-xs text-muted">${m.short}</span>
      </div>`).join('');

    // The bars are hidden from screen readers; the table under them has the same numbers
    $('#growth-chart').html(`
      <p class="text-sm text-muted">${total} new ${total === 1 ? 'user' : 'users'} in the last 6 months</p>
      <div class="mt-4 flex items-end gap-3" aria-hidden="true">${bars}</div>
      <table class="sr-only">
        <caption>New users per month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">New users</th></tr></thead>
        <tbody>${months.map(m => `<tr><th scope="row">${m.long}</th><td>${m.count}</td></tr>`).join('')}</tbody>
      </table>`);
  }

  function load() {
    const button = $('#refresh-btn');
    UI.loading(button, true);
    $('#stats').html(`<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${UI.skeleton(3)}</div>`);

    Api.get('/dashboard/admin')
      .then(function (res) {
        renderStats(res.data);
        renderChart(lastSixMonths(res.data.user_growth));
        $('#updated-at').text('Updated at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      })
      .fail(function (err) {
        UI.error('#stats', err.message, load);
      })
      .always(function () {
        UI.loading(button, false);
      });
  }

  // Refresh loads the numbers again, so the cards and chart update after changes
  $('#refresh-btn').on('click', load);
  load();
});
