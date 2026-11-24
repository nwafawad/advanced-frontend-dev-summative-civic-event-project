/* Event form (admin): create a new event, or edit one with ?id=... */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  // ROLE GUARD 2: only admins can create or edit events
  if (!Auth.requireAdmin()) return;

  const eventId = Utils.qs('id');   // empty when creating a new event
  let imageFile = null;             // the new image the admin picked, if any

  // Convert an ISO string to the value for a datetime-local input, in the user's local timezone
  function toInputValue(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  function showPreview(src) {
    $('#image-preview').attr('src', src).removeClass('hidden');
  }

  function setProgress(percent) {
    $('#upload-progress').val(percent);
    $('#upload-label').text('Uploading image: ' + percent + '%');
  }

  // Edit mode: load the event and fill in the form
  function loadEvent() {
    const button = $('#save-btn');
    UI.loading(button, true);
    Api.get('/events/' + eventId)
      .then(function (res) {
        const event = res.data;
        $('#title').val(event.title);
        $('#description').val(event.description || '');
        $('#location').val(event.location || '');
        $('#starts_at').val(toInputValue(event.starts_at));
        $('#ends_at').val(toInputValue(event.ends_at));
        $('#published').prop('checked', event.published !== false);
        if (event.metadata && event.metadata.image_url) showPreview(event.metadata.image_url);
        UI.loading(button, false);
      })
      .fail(function (err) {
        $('#form-error').text(err.status === 404 ? 'This event no longer exists.' : err.message);
      });
  }

  if (eventId) {
    $('h1').text('Edit event');
    document.title = 'Edit event, CivicEvents+';
    $('#save-btn').text('Save changes');
    $('#cancel-link').attr('href', 'event.html?id=' + eventId);
    loadEvent();
  }

  // Check the image as soon as it is picked, and preview it before uploading
  $('#image').on('change', function () {
    const file = this.files[0];
    $('#image').removeAttr('aria-invalid').removeClass('border-red-700');
    $('#image-error').text('');
    imageFile = null;
    if (!file) return;

    const problem = Utils.validateFile(file, 'image');
    if (problem) {
      UI.fieldError('image', problem);
      this.value = '';   // remove the bad file
      return;
    }
    imageFile = file;
    showPreview(URL.createObjectURL(file));
  });

  $('#event-form').on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors(this);

    // Not called "location": that name would hide window.location used below
    const title = $('#title').val().trim();
    const place = $('#location').val().trim();
    const startsAt = $('#starts_at').val();
    const endsAt = $('#ends_at').val();

    let valid = true;
    if (!title)    { UI.fieldError('title', 'Enter a title.'); valid = false; }
    if (!place)    { UI.fieldError('location', 'Enter a location.'); valid = false; }
    if (!startsAt) { UI.fieldError('starts_at', 'Choose when the event starts.'); valid = false; }
    if (!endsAt) {
      UI.fieldError('ends_at', 'Choose when the event ends.'); valid = false;
    } else if (startsAt && endsAt <= startsAt) {
      UI.fieldError('ends_at', 'The end must be after the start.'); valid = false;
    }
    if (!valid) {
      $('[aria-invalid]').first().focus();
      return;
    }

    // multipart/form-data: the text fields plus the file under the key "image"
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', $('#description').val().trim());
    formData.append('location', place);
    formData.append('starts_at', new Date(startsAt).toISOString());
    formData.append('ends_at', new Date(endsAt).toISOString());
    formData.append('published', $('#published').is(':checked'));
    if (imageFile) formData.append('image', imageFile);

    const button = $('#save-btn');
    UI.loading(button, true);
    if (imageFile) {
      setProgress(0);
      $('#upload-status').removeClass('hidden');
    }

    const request = eventId
      ? Api.upload('/events/' + eventId, formData, 'PUT', setProgress)
      : Api.upload('/events', formData, 'POST', setProgress);

    request
      .then(function (res) {
        UI.toast(eventId ? 'Event updated.' : 'Event created. All users have been notified.');
        // Wait a moment so the message can be read, then open the event
        setTimeout(function () {
          location.href = 'event.html?id=' + res.data.id;
        }, 1200);
      })
      .fail(function (err) {
        UI.loading(button, false);
        $('#upload-status').addClass('hidden');
        $('#form-error').text(err.message);
      });
  });
});