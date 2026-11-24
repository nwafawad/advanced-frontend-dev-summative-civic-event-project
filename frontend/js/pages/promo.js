/* Promo page: video with captions built from caption_text, transcript, and admin publish/edit/delete. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();

  const id = Utils.qs('id');
  let current = null;

  function clearPromosCache() {
    sessionStorage.removeItem(CONFIG.PROMOS_CACHE_KEY);   // the promos list is now out of date
  }

  function notFound() {
    $('#promo').html(UI.notFound('Promo not found', 'It may have been removed. Go back to the promos list.'));
  }

  function load() {
    $('#promo').html(UI.skeleton(1));
    Api.get('/promos/' + id)
      .then(function (res) {
        current = res.data;
        // Normal users cannot open drafts
        if (!Auth.isAdmin() && !current.published) return notFound();
        show(current);
      })
      .fail(function (err) {
        if (err.status === 404) notFound();
        else UI.error('#promo', err.message, load);
      });
  }

  // 65.5 seconds becomes "00:01:05.500" (the time format captions files use)
  function vttTime(seconds) {
    return new Date(seconds * 1000).toISOString().slice(11, 23);
  }

  // The API only stores plain caption text, so we build a WebVTT captions file in the browser.
  // Each line of the text becomes one caption, spread evenly over the video.
  function buildCaptions(text, duration) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const total = isFinite(duration) && duration > 0 ? duration : lines.length * 4;
    const step = total / lines.length;

    let vtt = 'WEBVTT\n\n';
    lines.forEach(function (line, i) {
      const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      vtt += vttTime(i * step) + ' --> ' + vttTime((i + 1) * step) + '\n' + safe + '\n\n';
    });
    return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  }

  function show(promo) {
    document.title = promo.title + ', CivicEvents+';
    const url = Utils.esc(promo.video_url);

    $('#promo').html(`
      <h1 id="promo-title" class="text-3xl font-bold">${Utils.esc(promo.title)}</h1>
      ${promo.published ? '' : '<p class="mt-2 text-sm font-semibold text-amber-900">Draft: only admins can see this</p>'}

      <video id="player" src="${url}" controls preload="metadata" playsinline
             aria-labelledby="promo-title" class="mt-6 w-full rounded-lg bg-black">
        Your browser cannot play this video. <a href="${url}">Download the video</a>.
      </video>
      <p id="player-error" role="alert" class="empty:hidden mt-2 text-sm text-red-800"></p>

      <button type="button" id="captions-btn" aria-pressed="true"
              class="mt-3 hidden rounded-md border border-gray-400 bg-brand-tint px-3 py-1.5 text-sm font-semibold">Captions</button>

      <p class="mt-6">${Utils.esc(promo.description || '')}</p>

      <h2 class="mt-8 text-xl font-semibold">Transcript</h2>
      <p class="mt-2 whitespace-pre-line text-sm">${Utils.esc(promo.caption_text || 'No transcript was provided for this promo.')}</p>

      ${Auth.isAdmin() ? `
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="promo-form.html?id=${promo.id}" class="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold">Edit</a>
          <button type="button" id="publish-btn" class="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold">
            ${promo.published ? 'Unpublish' : 'Publish'}</button>
          <button type="button" id="delete-btn" class="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">Delete</button>
        </div>` : ''}`);

    $('#player')
      // Add the captions once we know how long the video is. They are on by default.
      .one('loadedmetadata', function () {
        if (!promo.caption_text) return;
        $('<track kind="captions" srclang="en" label="English" default>')
          .attr('src', buildCaptions(promo.caption_text, this.duration))
          .appendTo(this);
        this.textTracks[0].mode = 'showing';
        $('#captions-btn').removeClass('hidden');
      })
      // Fallback when the browser cannot play this format
      .on('error', function () {
        $('#player-error').html(`This video could not be played. <a href="${url}" class="underline">Download it</a> instead.`);
      });
  }

  // Captions on/off (the player's own CC button works too)
  $('#main').on('click', '#captions-btn', function () {
    const track = $('#player')[0].textTracks[0];
    const on = track.mode !== 'showing';
    track.mode = on ? 'showing' : 'hidden';
    $(this).attr('aria-pressed', on).toggleClass('bg-brand-tint', on);
  });

  // ROLE GUARD (UI only): these buttons are only rendered for admins, and the API checks again
  $('#main').on('click', '#publish-btn', function () {
    const button = $(this);
    const action = current.published ? 'unpublish' : 'publish';
    UI.loading(button, true);
    Api.patch('/promos/' + id + '/' + action)
      .then(function (res) {
        clearPromosCache();
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
    UI.confirm('Delete this promo?', `"${current.title}" will be removed for everyone. This cannot be undone.`, function () {
      Api.del('/promos/' + id)
        .then(function () {
          clearPromosCache();
          location.href = 'promos.html?deleted=1';
        })
        .fail(function (err) { UI.toast(err.message, 'error'); });
    });
  });

  if (id) load();
  else notFound();
});