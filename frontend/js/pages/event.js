/* Event page: details, register/cancel (users), attendees and Edit/Delete (admins), feedback. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  Auth.applyRoleVisibility();   // removes the attendees section for normal users

  const eventId = Utils.qs('id');
  let currentEvent = null;
  let myFeedback = null;        // this user's feedback for this event, if they left one


  // ROLE GUARD UI only: admins read all feedback, normal users write their own
  if (Auth.isAdmin()) $('#feedback-form').remove();

  function notFound() {
    $('#event-detail').html(UI.notFound('Event not found', 'It may have been deleted. Go back to the events list.'));
  }

  function loadEvent() {
    $('#event-detail').html(UI.skeleton(1));
    Api.get('/events/' + eventId)
      .then(function (res) {
        const event = res.data;
        // Normal users cannot open unpublished events
        if (!Auth.isAdmin() && event.published === false) return notFound();

        showEvent(event);
        $('.after-load').removeClass('hidden');
        loadFeedback();
        if (Auth.isAdmin()) {
          loadAttendees();
        } else {
          EventActions.loadMyRegistrations().then(function (statuses) {
            showRegistration(statuses[eventId]);
          });
        }
      })
      .fail(function (err) {
        if (err.status === 404) notFound();
        else UI.error('#event-detail', err.message, loadEvent);
      });
  }

  function showEvent(event) {
    currentEvent = event;
    document.title = event.title + ', CivicEvents+';
    const image = event.metadata && event.metadata.image_url;
    const mapLink = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.location || '');

    $('#event-detail').html(`
      ${image ? `<img src="${Utils.esc(image)}" alt="" class="mb-6 max-h-80 w-full rounded-lg object-cover">` : ''}
      <h1 class="text-3xl font-bold">${Utils.esc(event.title)}</h1>

      <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt class="font-semibold">Starts</dt>   <dd>${Utils.formatDate(event.starts_at)}</dd>
        <dt class="font-semibold">Ends</dt>     <dd>${Utils.formatDate(event.ends_at)}</dd>
        <dt class="font-semibold">Location</dt>
        <dd>
          ${Utils.esc(event.location)}
          <a href="${mapLink}" target="_blank" rel="noopener" class="ml-2 text-brand underline">
            Open in Google Maps<span class="sr-only"> (opens in a new tab)</span></a>
        </dd>
      </dl>

      <p class="mt-6 max-w-prose whitespace-pre-line">${Utils.esc(event.description || 'No description yet.')}</p>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        ${Auth.isAdmin() ? `
          <a href="event-form.html?id=${event.id}" class="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold">Edit</a>
          <button type="button" id="delete-btn" class="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">Delete</button>
        ` : `
          <button type="button" id="register-btn"
                  class="hidden rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"></button>
          <p id="register-status" tabindex="-1" class="text-sm" aria-live="polite"></p>
        `}
      </div>`);
  }

  /* Register / cancel (normal users) */

  // status is 'registered', 'cancelled' or undefined (never registered)
  function showRegistration(status) {
    const button = $('#register-btn').addClass('hidden');
    const message = $('#register-status');

    if (status === 'registered') {
      message.text('You are registered for this event.');
      button.text('Cancel registration').data('action', 'cancel').removeClass('hidden');
    } else if (status === 'cancelled') {
      // The backend does not allow registering again after cancelling
      message.text('You cancelled your registration for this event.');
    } else if (EventActions.isPast(currentEvent)) {
      message.text('This event has ended.');
    } else {
      message.text('');
      button.text('Register').data('action', 'register').removeClass('hidden');
    }
  }

  $('#main').on('click', '#register-btn', function () {
    const button = $(this);

    if (button.data('action') === 'register') {
      UI.loading(button, true);
      EventActions.register(eventId)
        .then(function () {
          UI.loading(button, false);
          showRegistration('registered');
          UI.toast('You are registered.');
        })
        .fail(function (err) {
          UI.loading(button, false);
          UI.toast(err.message, 'error');
        });
      return;
    }

    UI.confirm('Cancel your registration?', 'You will not be able to register for this event again.', function () {
      UI.loading(button, true);
      EventActions.cancel(eventId)
        .then(function () {
          UI.loading(button, false);
          showRegistration('cancelled');
          $('#register-status').focus();   // the button is gone, so move focus to the message
          UI.toast('Registration cancelled.');
        })
        .fail(function (err) {
          UI.loading(button, false);
          UI.toast(err.message, 'error');
        });
    });
  });

  /* Edit / delete and attendees (admins) */

  $('#main').on('click', '#delete-btn', function () {
    EventActions.remove(currentEvent, function () {
      location.href = 'events.html?deleted=1';
    });
  });

  function loadAttendees() {
    $('#attendee-list').html('<p class="text-sm text-muted">Loading...</p>');
    Api.get('/event-registrations/event/' + eventId + '/attendees')
      .then(function (res) {
        if (res.data.length === 0) {
          $('#attendee-list').html(UI.empty('No one has registered yet', 'Registrations will appear here.'));
          return;
        }
        const rows = res.data.map(person => `
          <tr class="border-b border-gray-100">
            <td class="py-2 pr-4">${Utils.esc(person.full_name)}</td>
            <td class="py-2 pr-4">${Utils.esc(person.email)}</td>
            <td class="py-2">${Utils.formatDate(person.created_at)}</td>
          </tr>`).join('');
        $('#attendee-list').html(`
          <p class="text-sm text-muted">${res.data.length} registered</p>
          <div class="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-white p-4">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th scope="col" class="py-2 pr-4">Name</th>
                  <th scope="col" class="py-2 pr-4">Email</th>
                  <th scope="col" class="py-2">Registered on</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`);
      })
      .fail(function (err) {
        UI.error('#attendee-list', err.message, loadAttendees);
      });
  }

  /* Feedback */

  // Stars are hidden from screen readers; the number is read instead
  function stars(rating) {
    return `<span aria-hidden="true" class="text-accent">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>`;
  }

  function loadFeedback() {
    if (Auth.isAdmin()) {
      // Admins: everyone's feedback and the average (admin-only endpoint)
      Api.get('/event-feedback/event/' + eventId)
        .then(function (res) { showAllFeedback(res.data); })
        .fail(function (err) { UI.error('#feedback-list', err.message, loadFeedback); });
      return;
    }

    // Normal users: find their own feedback so the form edits it instead of adding a second one
    $('#feedback-summary').html('<p class="text-sm text-muted">You can rate each event once and change your rating later.</p>');
    Api.get('/event-feedback/my-feedback').then(function (res) {
      myFeedback = res.data.find(f => f.event_id === eventId) || null;
      if (myFeedback) {
        $(`input[name="rating"][value="${myFeedback.rating}"]`).prop('checked', true);
        $('#comment').val(myFeedback.comment || '');
        $('#feedback-form-title').text('Your feedback');
        $('#feedback-btn').text('Update feedback');
      }
    });
  }

  function showAllFeedback(list) {
    if (list.length === 0) {
      $('#feedback-list').html(UI.empty('No feedback yet', 'Ratings and comments will appear here.'));
      return;
    }
    const average = list.reduce((sum, f) => sum + f.rating, 0) / list.length;
    $('#feedback-summary').html(`
      <p class="text-lg font-semibold">${stars(Math.round(average))} ${average.toFixed(1)} out of 5</p>
      <p class="text-sm text-muted">${list.length} ${list.length === 1 ? 'rating' : 'ratings'}</p>`);

    $('#feedback-list').html(list.map(f => `
      <article class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="font-semibold">${Utils.esc(f.full_name)}</p>
        <p class="text-sm">${stars(f.rating)} <span class="sr-only">Rated</span> ${f.rating} out of 5</p>
        ${f.comment ? `<p class="mt-1 text-sm">${Utils.esc(f.comment)}</p>` : ''}
        <p class="mt-1 text-xs text-muted">${Utils.timeAgo(f.created_at)}</p>
      </article>`).join(''));
  }

  $('#feedback-form').on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors(this);

    const rating = Number($('input[name="rating"]:checked').val());
    const comment = $('#comment').val().trim();
    if (!rating) {
      $('#rating-error').text('Choose a rating from 1 to 5.');
      $('input[name="rating"]').first().focus();
      return;
    }

    const button = $('#feedback-btn');
    UI.loading(button, true);

    // One feedback per event: update it if it exists, otherwise create it
    const request = myFeedback
      ? Api.put('/event-feedback/' + myFeedback.id, { rating, comment })
      : Api.post('/event-feedback', { event_id: eventId, rating, comment });

    request
      .then(function () {
        UI.loading(button, false);
        UI.toast(myFeedback ? 'Feedback updated.' : 'Thanks for your feedback!');
        loadFeedback();
      })
      .fail(function (err) {
        UI.loading(button, false);
        $('#form-error').text(err.status === 409 ? 'You already rated this event.' : err.message);
      });
  });

  if (eventId) loadEvent();
  else notFound();
});