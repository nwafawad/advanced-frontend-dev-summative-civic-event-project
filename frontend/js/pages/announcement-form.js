/* Announcement form (admin): create with an audio upload, or edit title/published with ?id=... */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  // ROLE GUARD 2: only admins can create or edit announcements
  if (!Auth.requireAdmin()) return;

  const id = Utils.qs('id');   // empty when creating
  let audioFile = null;

  function setProgress(percent) {
    $('#upload-progress').val(percent);
    $('#upload-label').text('Uploading audio: ' + percent + '%');
  }

  // Edit mode. The API cannot replace the audio, so only title and published can change.
  if (id) {
    $('h1').text('Edit announcement');
    document.title = 'Edit announcement, CivicEvents+';
    $('#save-btn').text('Save changes');
    $('#back-link, #cancel-link').attr('href', 'announcement.html?id=' + id);
    $('#audio-field').html('<p class="text-sm text-muted">The audio cannot be changed. To use a different recording, create a new announcement.</p>');

    UI.loading($('#save-btn'), true);
    Api.get('/announcements/' + id)
      .then(function (res) {
        $('#title').val(res.data.title);
        $('#published').prop('checked', res.data.published);
        UI.loading($('#save-btn'), false);
      })
      .fail(function (err) {
        $('#form-error').text(err.status === 404 ? 'This announcement no longer exists.' : err.message);
      });
  }

  // Check the file as soon as it is picked, and let the admin listen before uploading
  $('#audio').on('change', function () {
    const file = this.files[0];
    $(this).removeAttr('aria-invalid').removeClass('border-red-700');
    $('#audio-error').text('');
    $('#audio-preview').addClass('hidden');
    audioFile = null;
    if (!file) return;

    const problem = Utils.validateFile(file, 'audio');
    if (problem) {
      UI.fieldError('audio', problem);
      this.value = '';
      return;
    }
    audioFile = file;
    $('#audio-preview').attr('src', URL.createObjectURL(file)).removeClass('hidden');
  });

  $('#announcement-form').on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors(this);

    const title = $('#title').val().trim();
    const published = $('#published').is(':checked');

    let valid = true;
    if (!title)             { UI.fieldError('title', 'Enter a title.'); valid = false; }
    if (!id && !audioFile)  { UI.fieldError('audio', 'Choose an audio file.'); valid = false; }
    if (!valid) {
      $('[aria-invalid]').first().focus();
      return;
    }

    const button = $('#save-btn');
    UI.loading(button, true);

    let request;
    if (id) {
      // Edit: plain JSON, no file
      request = Api.put('/announcements/' + id, { title, published });
    } else {
      // Create: multipart/form-data with the file under the key "audio"
      const formData = new FormData();
      formData.append('title', title);
      formData.append('published', published);
      formData.append('audio', audioFile);
      setProgress(0);
      $('#upload-status').removeClass('hidden');
      request = Api.upload('/announcements', formData, 'POST', setProgress);
    }

    request
      .then(function (res) {
        UI.toast(id ? 'Announcement updated.' : 'Announcement created. All users have been notified.');
        setTimeout(function () {
          location.href = 'announcement.html?id=' + res.data.id;
        }, 1200);
      })
      .fail(function (err) {
        UI.loading(button, false);
        $('#upload-status').addClass('hidden');
        $('#form-error').text(err.message);
      });
  });
});