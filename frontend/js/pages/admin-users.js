/* Admin users: search, filter by status, and enable/disable accounts.
   GET /users returns a plain list (no total), so we load everyone once and page in the browser. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  if (!Auth.requireAdmin()) return;   // ROLE GUARD 2: normal users see "no access"
  Layout.adminSidebar();

  const PER_PAGE = 10;
  let allUsers = [];
  let currentPage = 1;

  function load() {
    $('#user-table').html('<p class="p-4 text-sm text-muted">Loading users...</p>');
    Api.get('/users?limit=1000')
      .then(function (res) {
        allUsers = res.data;
        render();
      })
      .fail(function (err) {
        UI.error('#user-table', err.message, load);
      });
  }

  function filteredUsers() {
    const search = $('#search').val().trim().toLowerCase();
    const status = $('#status').val();
    return allUsers.filter(function (user) {
      if (search && !(user.full_name + ' ' + user.email).toLowerCase().includes(search)) return false;
      if (status === 'active' && !user.is_active) return false;
      if (status === 'disabled' && user.is_active) return false;
      return true;
    });
  }

  function row(user) {
    const isMe = user.id === Auth.user().id;
    const name = Utils.esc(user.full_name);
    const badge = user.is_active
      ? '<span class="rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">Active</span>'
      : '<span class="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">Disabled</span>';

    // No button on your own row, so an admin cannot lock themselves out
    const button = isMe ? '' : `
      <button type="button" data-id="${user.id}" aria-label="${user.is_active ? 'Disable' : 'Enable'} ${name}"
              class="toggle-btn rounded-md px-3 py-1.5 text-sm font-semibold
                     ${user.is_active ? 'border border-red-700 text-red-800' : 'bg-brand text-white hover:bg-brand-dark'}">
        ${user.is_active ? 'Disable' : 'Enable'}</button>`;

    return `
      <tr class="border-t border-gray-200">
        <th scope="row" class="px-4 py-3 text-left font-semibold">
          ${name} ${isMe ? '<span class="text-xs font-normal text-muted">(you)</span>' : ''}</th>
        <td class="px-4 py-3">${Utils.esc(user.email)}</td>
        <td class="px-4 py-3 capitalize">${Utils.esc(user.role)}</td>
        <td class="px-4 py-3">${badge}</td>
        <td class="whitespace-nowrap px-4 py-3">${new Date(user.created_at).toLocaleDateString()}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <button type="button" data-id="${user.id}" aria-label="View ${name}"
                    class="view-btn rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">View</button>
            ${button}
          </div>
        </td>
      </tr>`;
  }

  function render() {
    const users = filteredUsers();
    const pageCount = Math.max(1, Math.ceil(users.length / PER_PAGE));
    if (currentPage > pageCount) currentPage = pageCount;
    const pageUsers = users.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    $('#result-count').text(users.length + (users.length === 1 ? ' user' : ' users'));

    if (users.length === 0) {
      $('#user-table').html(`<div class="p-4">${UI.empty('No users found', 'Try a different search or status.')}</div>`);
    } else {
      $('#user-table').html(`
        <table class="w-full text-sm">
          <caption class="sr-only">Users, page ${currentPage} of ${pageCount}</caption>
          <thead class="bg-gray-50 text-left">
            <tr>
              <th scope="col" class="px-4 py-3">Name</th>
              <th scope="col" class="px-4 py-3">Email</th>
              <th scope="col" class="px-4 py-3">Role</th>
              <th scope="col" class="px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3">Joined</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>${pageUsers.map(row).join('')}</tbody>
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

  // After the table is redrawn, put focus back on the same user's button
  function focusUser(id) {
    const button = $(`#user-table .toggle-btn[data-id="${id}"]`);
    if (button.length) button.focus();
    else $('h1').focus();   // the status filter now hides this user
  }

  /* VIEW PROFILE: loads one user with GET /users/:id (admin-only endpoint)
     and shows it in a dialog. Read only: roles cannot be changed from the UI. */
  function showProfile(user, openerButton) {
    const formatDate = iso => iso
      ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Never';

    const dialog = $(`
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="profile-title"
             class="w-full max-w-md rounded-lg bg-white p-6">
          <h2 id="profile-title" class="text-lg font-semibold">${Utils.esc(user.full_name)}</h2>
          <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt class="text-muted">Email</dt>        <dd class="break-all font-semibold">${Utils.esc(user.email)}</dd>
            <dt class="text-muted">Role</dt>         <dd class="font-semibold capitalize">${Utils.esc(user.role)}</dd>
            <dt class="text-muted">Status</dt>       <dd class="font-semibold">${user.is_active ? 'Active' : 'Disabled'}</dd>
            <dt class="text-muted">Joined</dt>       <dd class="font-semibold">${formatDate(user.created_at)}</dd>
            <dt class="text-muted">Last updated</dt> <dd class="font-semibold">${formatDate(user.updated_at)}</dd>
          </dl>
          <p class="mt-4 text-xs text-muted">Roles cannot be changed from the app.</p>
          <div class="mt-6 flex justify-end">
            <button type="button" class="close-btn rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Close</button>
          </div>
        </div>
      </div>`);

    function close() {
      dialog.remove();
      $(document).off('keydown.profile');
      openerButton.focus();   // back to the View button that opened it
    }

    dialog.find('.close-btn').on('click', close);
    // Clicking the dark background closes it too
    dialog.on('click', function (e) { if (e.target === this) close(); });
    $(document).on('keydown.profile', function (e) {
      if (e.key === 'Escape') close();
      // Close is the only button, so Tab stays on it (focus never leaves the dialog)
      if (e.key === 'Tab') { e.preventDefault(); dialog.find('.close-btn').focus(); }
    });

    $('body').append(dialog);
    dialog.find('.close-btn').focus();
  }

  $('#user-table').on('click', '.view-btn', function () {
    const button = $(this);
    UI.loading(button, true);
    Api.get('/users/' + button.data('id'))
      .then(function (res) {
        UI.loading(button, false);
        showProfile(res.data, button);
      })
      .fail(function (err) {
        UI.loading(button, false);
        UI.toast(err.status === 404 ? 'This user no longer exists.' : err.message, 'error');
      });
  });

  // ROLE GUARD (UI only): this page is admin-only, and the API checks again (403).
  // The toggle button is only drawn for other users, and the API rejects attempts to disable yourself (403).
  $('#user-table').on('click', '.toggle-btn', function () {
    const user = allUsers.find(u => u.id === $(this).data('id'));
    const action = user.is_active ? 'disable' : 'enable';

    function send() {
      user.is_active = action === 'enable';
      render();
      focusUser(user.id);

      Api.patch('/users/' + user.id + '/' + action)
        .then(function () {
          UI.toast(action === 'enable' ? user.full_name + ' can log in again.' : user.full_name + ' has been disabled.');
        })
        .fail(function (err) {
          user.is_active = action !== 'enable';   // put it back
          render();
          focusUser(user.id);
          UI.toast('Could not ' + action + ' ' + user.full_name + '. ' + err.message, 'error');
        });
    }

    if (action === 'disable') {
      UI.confirm('Disable ' + user.full_name + '?', 'They will not be able to log in until you enable the account again.', send);
    } else {
      send();
    }
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
  $('#status').on('change', function () {
    currentPage = 1;
    render();
  });

  load();
});
