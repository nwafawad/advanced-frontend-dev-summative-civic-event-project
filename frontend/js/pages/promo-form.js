/* Promo form (admin): create a promo with a video, or edit one with ?id=... */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  // ROLE GUARD 2: only admins can create or edit promos
  if (!Auth.requireAdmin()) return;

  const id = Utils.qs('id');   // empty when creating
  let videoFile = null;

  function setProgress(percent) {
    $('#upload-progress').val(percent);
    $('#upload-label').text('Uploading video: ' + percent + '%');
  }

  // Edit mode: fill in the form. Picking a new video is optional.
  if (id) {
    $('h1').text('Edit promo');
    document.title = 'Edit promo, CivicEvents+';
    $('#save-btn').text('Save changes');
    $('#back-link, #cancel-link').attr('href', 'promo.html?id=' + id);
    $('#video-hint').text('Leave empty to keep the current video. MP4 is best, up to 8 MB.');

    UI.loading($('#save-btn'), true);
    Api.get('/promos/' + id)
      .then(function (res) {
        const promo = res.data;
        $('#title').val(promo.title);
        $('#description').val(promo.description || '');
        $('#caption_text').val(promo.caption_text || '');
        $('#published').prop('checked', promo.published);
        $('#video-preview').attr('src', promo.video_url).removeClass('hidden');
        UI.loading($('#save-btn'), false);
      })
      .fail(function (err) {
        $('#form-error').text(err.status === 404 ? 'This promo no longer exists.' : err.message);
      });
  }

  // Check the video as soon as it is picked, and preview it before uploading
  $('#video').on('change', function () {
    const file = this.files[0];
    $(this).removeAttr('aria-invalid').removeClass('border-red-700');
    $('#video-error').text('');
    videoFile = null;
    if (!file) return;

    const problem = Utils.validateFile(file, 'video');
    if (problem) {
      UI.fieldError('video', problem);
      this.value = '';
      return;
    }
    videoFile = file;
    $('#video-preview').attr('src', URL.createObjectURL(file)).removeClass('hidden');
  });

  $('#promo-form').on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors(this);

    const title = $('#title').val().trim();
    const description = $('#description').val().trim();
    const captions = $('#caption_text').val().trim();
    const published = $('#published').is(':checked');

    // The API requires title, description and captions
    let valid = true;
    if (!title)       { UI.fieldError('title', 'Enter a title.'); valid = false; }
    if (!description) { UI.fieldError('description', 'Enter a short description.'); valid = false; }
    if (!id && !videoFile) { UI.fieldError('video', 'Choose a video file.'); valid = false; }
    if (!captions)    { UI.fieldError('caption_text', 'Enter the captions, one line per caption.'); valid = false; }
    if (!valid) {
      $('[aria-invalid]').first().focus();
      return;
    }

    // multipart/form-data: text fields plus the file under the key "video"
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('caption_text', captions);
    if (id) formData.append('published', published);   // the API only reads this when editing
    if (videoFile) formData.append('video', videoFile);

    const button = $('#save-btn');
    UI.loading(button, true);
    if (videoFile) {
      setProgress(0);
      $('#upload-status').removeClass('hidden');
    }

    const request = id
      ? Api.upload('/promos/' + id, formData, 'PUT', setProgress)
      : Api.upload('/promos', formData, 'POST', setProgress);

    request
      .then(function (res) {
        // New promos are always published by the API, so unpublish right away if the switch is off
        if (!id && !published) return Api.patch('/promos/' + res.data.id + '/unpublish');
        return res;
      })
      .then(function (res) {
        sessionStorage.removeItem(CONFIG.PROMOS_CACHE_KEY);   // the promos list is now out of date
        UI.toast(id ? 'Promo updated.' : 'Promo created. All users have been notified.');
        setTimeout(function () {
          location.href = 'promo.html?id=' + res.data.id;
        }, 1200);
      })
      .fail(function (err) {
        UI.loading(button, false);
        $('#upload-status').addClass('hidden');
        $('#form-error').text(err.message);
      });
  });
});