/* Announcement page: audio player with time, transcript note, and admin publish/edit/delete. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();

  const id = Utils.qs('id');
  let current = null;

  function notFound() {
    $('#announcement').html(UI.notFound('Announcement not found', 'It may have been removed. Go back to the announcements list.'));
  }

  function load() {
    $('#announcement').html(UI.skeleton(1));
    Api.get('/announcements/' + id)
      .then(function (res) {
        current = res.data;
        // Normal users cannot open drafts
        if (!Auth.isAdmin() && !current.published) return notFound();
        show(current);
      })
      .fail(function (err) {
        if (err.status === 404) notFound();
        else UI.error('#announcement', err.message, load);
      });
  }

  function show(item) {
    document.title = item.title + ', CivicEvents+';
    const url = Utils.esc(item.audio_url);

    $('#announcement').html(`
      <h1 id="announcement-title" class="text-3xl font-bold">${Utils.esc(item.title)}</h1>
      <p class="mt-2 flex flex-wrap gap-x-4 text-sm text-muted">
        <span>Posted ${Utils.formatDate(item.created_at)}</span>
        <span id="time">Length loading...</span>
        ${item.published ? '' : '<span class="font-semibold text-amber-900">Draft: only admins can see this</span>'}
      </p>

      <div class="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <audio id="player" src="${url}" controls preload="metadata" aria-labelledby="announcement-title" class="w-full">
          Your browser cannot play audio. <a href="${url}">Download the audio file</a>.
        </audio>
        <p id="player-error" role="alert" class="empty:hidden mt-2 text-sm text-red-800"></p>
      </div>

      <h2 class="mt-8 text-xl font-semibold">Transcript</h2>
      <p class="mt-2 text-sm text-muted">No transcript was provided for this announcement.</p>

      ${Auth.isAdmin() ? `
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="announcement-form.html?id=${item.id}" class="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold">Edit</a>
          <button type="button" id="publish-btn" class="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold">
            ${item.published ? 'Unpublish' : 'Publish'}</button>
          <button type="button" id="delete-btn" class="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">Delete</button>
        </div>` : ''}`);

    // Current time and length, e.g. "Time 0:42 / 2:10"
    $('#player')
      .on('loadedmetadata timeupdate', function () {
        $('#time').text('Time ' + Utils.formatDuration(this.currentTime) + ' / ' + Utils.formatDuration(this.duration));
      })
      // Fallback when the browser cannot play this format
      .on('error', function () {
        $('#player-error').html(`This audio could not be played. <a href="${url}" class="underline">Download the file</a> instead.`);
      });
  }

  // ROLE GUARD UI only: these buttons are only rendered for admins, and the API checks again
  $('#main').on('click', '#publish-btn', function () {
    const button = $(this);
    const action = current.published ? 'unpublish' : 'publish';
    UI.loading(button, true);
    Api.patch('/announcements/' + id + '/' + action)
      .then(function (res) {
        UI.toast(action === 'publish' ? 'Published. Users have been notified.' : 'Unpublished. Users can no longer see it.');
        current = res.data;
        show(current);
        $('#publish-btn').focus();
      })
      .fail(function (err) {
        UI.loading(button, false);
        UI.toast(err.message, 'error');
      });
  });

  $('#main').on('click', '#delete-btn', function () {
    UI.confirm('Delete this announcement?', `"${current.title}" will be removed for everyone. This cannot be undone.`, function () {
      Api.del('/announcements/' + id)
        .then(function () { location.href = 'announcements.html?deleted=1'; })
        .fail(function (err) { UI.toast(err.message, 'error'); });
    });
  });

  if (id) load();
  else notFound();
});