/* Announcements list: audio cards with a player.
   Normal users only see published announcements. Admins also see drafts. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  Auth.applyRoleVisibility();   // removes "New announcement" for normal users

  // ROLE GUARD UI only: the Edit link is only drawn for admins. The API checks again (403).
  function card(item) {
    const title = Utils.esc(item.title);
    const url = Utils.esc(item.audio_url);
    return `
      <article class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-semibold">
            <a href="announcement.html?id=${item.id}" class="hover:underline">${title}</a>
          </h2>
          ${item.published ? '' : '<span class="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">Draft</span>'}
        </div>
        <p class="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
          <span>Posted ${Utils.formatDate(item.created_at)}</span>
          <span>Length <span class="duration">loading...</span></span>
        </p>
        <audio src="${url}" controls preload="metadata" aria-label="Audio for ${title}" class="mt-3 w-full">
          Your browser cannot play audio. <a href="${url}">Download the audio</a>.
        </audio>
        ${Auth.isAdmin() ? `<a href="announcement-form.html?id=${item.id}" aria-label="Edit ${title}"
             class="mt-3 inline-block rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">Edit</a>` : ''}
      </article>`;
  }

  function setUpAudio() {
    $('#announcement-list audio')
      // The API has no duration, so read it from the file once the browser loads its details
      .on('loadedmetadata', function () {
        $(this).closest('article').find('.duration').text(Utils.formatDuration(this.duration));
      })
      .on('error', function () {
        $(this).closest('article').find('.duration').text('unavailable');
      })
      // Only one announcement plays at a time
      .on('play', function () {
        $('#announcement-list audio').not(this).each(function () { this.pause(); });
      });
  }

  function load() {
    $('#announcement-list').html(UI.skeleton(4));
    Api.get('/announcements?limit=100')
      .then(function (res) {
        // ROLE GUARD UI only: normal users only see published announcements, admins also see drafts
        const items = res.data.filter(a => Auth.isAdmin() || a.published);
        if (items.length === 0) {
          $('#announcement-list').html(`<div class="sm:col-span-2">
            ${UI.empty('No announcements yet', 'New audio announcements will appear here.')}</div>`);
          return;
        }
        $('#announcement-list').html(items.map(card).join(''));
        setUpAudio();
      })
      .fail(function (err) {
        UI.error('#announcement-list', err.message, load);
      });
  }

  if (Utils.qs('deleted')) UI.toast('Announcement deleted.');
  load();
});