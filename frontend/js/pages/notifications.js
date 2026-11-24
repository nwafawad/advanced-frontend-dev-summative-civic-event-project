/* Notifications inbox: everything sent to all users or to me.
   Read/unread is saved in this browser by Layout. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();

  let all = [];

  function load() {
    $('#notification-list').html(UI.skeleton(3));
    Api.get('/notifications')
      .then(function (res) {
        all = res.data;
        render();
      })
      .fail(function (err) {
        UI.error('#notification-list', err.message, load);
      });
  }

  function item(n) {
    const unread = !Layout.isRead(n.id);
    const small = 'rounded-md px-3 py-1.5 text-sm font-semibold';
    // Many titles are the same ("New Event Published"), so the buttons point to the message with aria-describedby
    return `
      <li class="rounded-lg border bg-white p-4 ${unread ? 'border-brand' : 'border-gray-200'}">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">${Utils.esc(CONFIG.NOTIFICATION_TYPES[n.type] || 'Notice')}</p>
        <h2 class="mt-1 flex items-center gap-2 ${unread ? 'font-bold' : 'font-semibold'}">
          ${unread ? '<span class="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true"></span><span class="sr-only">Unread:</span>' : ''}
          <a href="notification.html?id=${n.id}" class="hover:underline">${Utils.esc(n.title)}</a>
        </h2>
        <p id="msg-${n.id}" class="mt-1 text-sm">${Utils.esc(n.message)}</p>
        <p class="mt-1 text-xs text-muted"><time datetime="${Utils.esc(n.created_at)}">${Utils.timeAgo(n.created_at)}</time></p>
        <div class="mt-3 flex flex-wrap gap-2">
          ${unread ? `<button type="button" data-id="${n.id}" aria-describedby="msg-${n.id}"
                       class="read-btn ${small} border border-gray-400">Mark as read</button>` : ''}
          ${Auth.isAdmin() ? `<button type="button" data-id="${n.id}" aria-describedby="msg-${n.id}"
                       class="delete-btn ${small} bg-red-700 text-white">Delete</button>` : ''}
        </div>
      </li>`;
  }

  function render() {
    const unreadCount = all.filter(n => !Layout.isRead(n.id)).length;
    const onlyUnread = $('#show').val() === 'unread';
    const list = all.filter(n => !onlyUnread || !Layout.isRead(n.id));

    Layout.notifications = all;   // keep the bell panel in step with this page
    Layout.setBadge(unreadCount);
    $('#unread-count').text(unreadCount + ' unread');
    $('#mark-all-btn').prop('disabled', unreadCount === 0);

    if (list.length === 0) {
      $('#notification-list').html(onlyUnread
        ? UI.empty('You are all caught up', 'There are no unread notifications.')
        : UI.empty('No notifications yet', 'News about events, announcements and promos will appear here.'));
      return;
    }
    $('#notification-list').html(`<ul class="space-y-3">${list.map(item).join('')}</ul>`);
  }

  // Mark one as read. Its button disappears, so focus moves to its title link.
  $('#notification-list').on('click', '.read-btn', function () {
    const id = $(this).data('id');
    Layout.markRead(id);
    render();
    const link = $(`#notification-list a[href="notification.html?id=${id}"]`);
    if (link.length) link.focus();
    else $('h1').focus();   // "Unread only" is on, so the item is gone
  });

  $('#mark-all-btn').on('click', function () {
    all.forEach(n => Layout.markRead(n.id));
    render();
    $('h1').focus();
    UI.toast('All notifications marked as read.');
  });

  $('#show').on('change', render);

  // ROLE GUARD (UI only): Delete is only drawn for admins, and the API rejects everyone else (403).
  // OPTIMISTIC UPDATE: the item disappears straight away and comes back if the server says no.
  $('#notification-list').on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    UI.confirm('Delete this notification?', 'It will be removed for every user. This cannot be undone.', function () {
      const before = all;
      all = all.filter(n => n.id !== id);
      render();
      $('h1').focus();

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

  if (Utils.qs('deleted')) UI.toast('Notification deleted.');
  load();
});
