/* Admin dashboard (stats and chart come in the dashboard step) */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  if (!Auth.requireAdmin()) return;   // ROLE GUARD 2: normal users see "no access"

  $('#main').html(`
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <p class="mt-2 text-muted">Statistics are coming soon.</p>`);
});