/* Admin notifications: a table of notifications with search, type filter and Delete.
   The API has no route to send a notification by hand, so this page only manages them. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  if (!Auth.requireAdmin()) return;   // ROLE GUARD 2: normal users see "no access"
  Layout.adminSidebar();

  const PER_PAGE = 10;
  let all = [];
  let currentPage = 1;

  function load() {
    $('#notification-table').html('<p class="p-4 text-sm text-muted">Loading notifications...</p>');
    Api.get('/notifications')
      .then(function (res) {
        all = res.data;
        render();
      })
      .fail(function (err) {
        UI.error('#notification-table', err.message, load);
      });
  }

  function filtered() {
    const search = $('#search').val().trim().toLowerCase();
    const type = $('#type').val();
    return all.filter(function (n) {
      if (search && !(n.title + ' ' + n.message).toLowerCase().includes(search)) return false;
      if (type !== 'all' && n.type !== type) return false;
      return true;
    });
  }

  function row(n) {
    const title = Utils.esc(n.title);
    // recipient_id empty = sent to everyone. Admins only get their own targeted ones, so the rest are "You".
    const audience = n.recipient_id ? 'You' : 'Everyone';
    return `
      <tr class="border-t border-gray-200 align-top">
        <th scope="row" class="px-4 py-3 text-left">
          <span class="font-semibold">${title}</span>
          <span id="msg-${n.id}" class="mt-0.5 block font-normal text-muted line-clamp-2">${Utils.esc(n.message)}</span>
        </th>
        <td class="px-4 py-3">${Utils.esc(CONFIG.NOTIFICATION_TYPES[n.type] || 'Notice')}</td>
        <td class="px-4 py-3">${audience}</td>
        <td class="whitespace-nowrap px-4 py-3"><time datetime="${Utils.esc(n.created_at)}">${Utils.formatDate(n.created_at)}</time></td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <a href="${Utils.page('notification.html?id=' + n.id)}" aria-describedby="msg-${n.id}"
               class="rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">View</a>
            <button type="button" data-id="${n.id}" aria-describedby="msg-${n.id}"
                    class="delete-btn rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  function render() {
    const list = filtered();
    const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (currentPage > pageCount) currentPage = pageCount;
    const pageItems = list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    $('#result-count').text(list.length + (list.length === 1 ? ' notification' : ' notifications'));

    // Keep the bell in the header in step with this page
    Layout.notifications = all;
    Layout.setBadge(all.filter(n => !Layout.isRead(n.id)).length);

    if (list.length === 0) {
      $('#notification-table').html(`<div class="p-4">${UI.empty('No notifications found', 'Try a different search or type.')}</div>`);
    } else {
      $('#notification-table').html(`
        <table class="w-full text-sm">
          <caption class="sr-only">Notifications, page ${currentPage} of ${pageCount}</caption>
          <thead class="bg-gray-50 text-left">
            <tr>
              <th scope="col" class="px-4 py-3">Notification</th>
              <th scope="col" class="px-4 py-3">Type</th>
              <th scope="col" class="px-4 py-3">Sent to</th>
              <th scope="col" class="px-4 py-3">Sent</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>${pageItems.map(row).join('')}</tbody>
        </table>`);
    }
    renderPagination(pageCount);
  }

  function renderPagination(pageCount) {
    if (pageCount <= 1) {
      $('#pagination').empty();
      return;
    }
    const btn = 'rounded-md border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-50';
    $('#pagination').html(`
      <button type="button" data-page="${currentPage - 1}" class="${btn}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
      <span class="text-sm">Page ${currentPage} of ${pageCount}</span>
      <button type="button" data-page="${currentPage + 1}" class="${btn}" ${currentPage === pageCount ? 'disabled' : ''}>Next</button>`);
  }

  // ROLE GUARD UI only: this page is admin-only, and DELETE /notifications/:id is admin-only in the API (403).
  // OPTIMISTIC UPDATE: the row disappears straight away and comes back if the server says no.
  $('#notification-table').on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    const notification = all.find(n => n.id === id);

    UI.confirm('Delete this notification?', `"${notification.title}" will be removed for every user. This cannot be undone.`, function () {
      const before = all;
      all = all.filter(n => n.id !== id);
      render();
      $('h1').focus();   // the row is gone, so move focus to the top

      Api.del('/notifications/' + id)
        .then(function () {
          UI.toast('Notification deleted.');
        })
        .fail(function (err) {
          all = before;   // put it back
          render();
          UI.toast('Could not delete the notification. ' + err.message, 'error');
        });
    });
  });

  $('#pagination').on('click', 'button', function () {
    currentPage = Number($(this).data('page'));
    render();
    $('h1').focus();
  });

  // Search and filter always go back to page 1
  $('#search').on('input', Utils.debounce(function () {
    currentPage = 1;
    render();
  }));
  $('#type').on('change', function () {
    currentPage = 1;
    render();
  });

  load();
});
