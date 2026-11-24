/* My registrations: events I signed up for, with Cancel on upcoming ones.
   The API also returns cancelled registrations (status 'cancelled'). */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();

  let registrations = [];

  const emptyText = {
    upcoming:  'You have no upcoming events.',
    past:      'You have no past events yet.',
    cancelled: 'You have not cancelled any registrations.',
    all:       'You have not registered for any events yet.',
  };

  function load() {
    $('#registration-list').html(UI.skeleton(2));
    Api.get('/event-registrations/my-registrations')
      .then(function (res) {
        // Soonest first
        registrations = res.data.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        render();
      })
      .fail(function (err) {
        UI.error('#registration-list', err.message, load);
      });
  }

  function filtered() {
    const show = $('#show').val();
    return registrations.filter(function (r) {
      const cancelled = r.status === 'cancelled';
      const past = EventActions.isPast(r);   // uses ends_at, which the API includes
      if (show === 'upcoming')  return !cancelled && !past;
      if (show === 'past')      return !cancelled && past;
      if (show === 'cancelled') return cancelled;
      return true;
    });
  }

  function badge(r) {
    const style = 'rounded px-2 py-0.5 text-xs font-semibold';
    if (r.status === 'cancelled') return `<span class="${style} bg-gray-100 text-gray-700">Cancelled</span>`;
    if (EventActions.isPast(r))   return `<span class="${style} bg-gray-100 text-gray-700">Ended</span>`;
    return `<span class="${style} bg-green-50 text-green-800">Registered</span>`;
  }

  function card(r) {
    const title = Utils.esc(r.title);
    const canCancel = r.status === 'registered' && !EventActions.isPast(r);
    return `
      <li class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-semibold">${title}</h2>
            ${badge(r)}
          </div>
          <p class="mt-1 text-sm text-muted">${Utils.formatDate(r.starts_at)}</p>
          <p class="text-sm text-muted">${Utils.esc(r.location || '')}</p>
        </div>
        <div class="flex gap-2">
          <a href="event.html?id=${r.event_id}" aria-label="View ${title}"
             class="rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">View</a>
          ${canCancel ? `<button type="button" data-id="${r.event_id}" aria-label="Cancel registration for ${title}"
             class="cancel-btn rounded-md border border-red-700 px-3 py-1.5 text-sm font-semibold text-red-800">Cancel</button>` : ''}
        </div>
      </li>`;
  }

  function render() {
    const list = filtered();
    $('#result-count').text(list.length + (list.length === 1 ? ' event' : ' events'));

    if (list.length === 0) {
      $('#registration-list').html(`
        ${UI.empty('Nothing to show', emptyText[$('#show').val()])}
        <p class="text-center"><a href="events.html" class="text-brand underline">Browse events</a></p>`);
      return;
    }
    $('#registration-list').html(`<ul class="space-y-3">${list.map(card).join('')}</ul>`);
  }

  // Cancel: ask first. The backend keeps the row, so the user cannot register for this event again.
  $('#registration-list').on('click', '.cancel-btn', function () {
    const eventId = $(this).data('id');
    const registration = registrations.find(r => r.event_id === eventId);
    UI.confirm('Cancel your registration?', `You will not be able to register for "${registration.title}" again.`, function () {
      EventActions.cancel(eventId)
        .then(function () {
          registration.status = 'cancelled';
          render();
          $('h1').focus();
          UI.toast('Your registration has been cancelled.');
        })
        .fail(function (err) {
          UI.toast(err.message, 'error');
        });
    });
  });

  $('#show').on('change', render);
  load();
});
