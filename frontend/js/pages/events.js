/* Events page list, search, filter, pages and card buttons.
   GET /events ignores query params, so we filter and paginate in the browser. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  Auth.applyRoleVisibility();   // removes "New event" for normal users

  let allEvents = [];
  let myRegistrations = {};     // normal users: { eventId: 'registered' or 'cancelled' }
  let currentPage = 1;

  function loadEvents() {
    $('#event-list').html(UI.skeleton(CONFIG.PAGE_SIZE));

    // Load the events and (for normal users) their registrations at the same time
    const registrations = Auth.isAdmin() ? {} : EventActions.loadMyRegistrations();
    $.when(Api.get('/events'), registrations)
      .then(function (eventsRes, statuses) {
        allEvents = eventsRes.data;
        myRegistrations = statuses;
        fillLocations();
        render();
      })
      .fail(function (err) {
        UI.error('#event-list', err.message, loadEvents);
      });
  }

  // Normal users only see published events. Admins see everything.
  function visibleEvents() {
    return allEvents.filter(event => Auth.isAdmin() || event.published !== false);
  }

  // Fill the Location dropdown with each place once, A to Z.
  // The API has no list of locations, so we take them from the events.
  function fillLocations() {
    const chosen = $('#location-filter').val();
    const places = [];
    visibleEvents().forEach(function (event) {
      const place = (event.location || '').trim();
      if (place && !places.includes(place)) places.push(place);
    });
    places.sort((a, b) => a.localeCompare(b));

    $('#location-filter').html('<option value="">All locations</option>' +
      places.map(place => `<option value="${Utils.esc(place)}">${Utils.esc(place)}</option>`).join(''));

    // Keep the choice if that place is still in the list
    if (places.includes(chosen)) $('#location-filter').val(chosen);
  }

  // Is the event on during the chosen day? (date is "YYYY-MM-DD" from the date picker)
  function isOnDate(event, date) {
    const dayStart = new Date(date + 'T00:00');    // midnight, local time
    const dayEnd = new Date(date + 'T00:00');
    dayEnd.setDate(dayEnd.getDate() + 1);           // next midnight
    return new Date(event.starts_at) < dayEnd && new Date(event.ends_at) >= dayStart;
  }

  // Apply the search box, date, location and Upcoming/Past/All filters
  function filteredEvents() {
    const search = $('#search').val().trim().toLowerCase();
    const date = $('#date').val();
    const place = $('#location-filter').val();
    const when = $('#when').val();

    return visibleEvents().filter(function (event) {
      const text = (event.title + ' ' + event.location).toLowerCase();
      const isPast = EventActions.isPast(event);
      if (search && !text.includes(search)) return false;
      if (date && !isOnDate(event, date)) return false;
      if (place && (event.location || '').trim() !== place) return false;
      if (when === 'upcoming' && isPast) return false;
      if (when === 'past' && !isPast) return false;
      return true;
    });
  }

  // ROLE GUARD UI only: admins get Edit/Delete, normal users get Register
  function cardButtons(event) {
    const title = Utils.esc(event.title);
    const small = 'rounded-md px-3 py-1.5 text-sm font-semibold';

    if (Auth.isAdmin()) {
      return `
        <a href="event-form.html?id=${event.id}" aria-label="Edit ${title}" class="${small} border border-gray-400">Edit</a>
        <button type="button" data-id="${event.id}" aria-label="Delete ${title}"
                class="delete-btn ${small} bg-red-700 text-white">Delete</button>`;
    }

    const status = myRegistrations[event.id];
    if (status === 'registered') {
      return `<span class="${small} text-green-700">✓ Registered</span>`;
    }
    if (status === 'cancelled' || EventActions.isPast(event)) {
      return '';   // cannot register again after cancelling, or the event is over
    }
    return `<button type="button" data-id="${event.id}" aria-label="Register for ${title}"
                    class="register-btn ${small} bg-brand text-white hover:bg-brand-dark">Register</button>`;
  }

  function eventCard(event) {
    const image = event.metadata && event.metadata.image_url;
    const description = event.description || '';
    const short = description.length > 100 ? description.slice(0, 100) + '...' : description;

    return `
      <article class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        ${image ? `<img src="${Utils.esc(image)}" alt="" loading="lazy" class="h-40 w-full object-cover">` : ''}
        <div class="flex flex-1 flex-col p-4">
          <h2 class="font-semibold">${Utils.esc(event.title)}</h2>
          <p class="mt-1 text-sm text-muted">${Utils.formatDate(event.starts_at)}</p>
          <p class="text-sm text-muted">${Utils.esc(event.location)}</p>
          ${short ? `<p class="mt-2 text-sm">${Utils.esc(short)}</p>` : ''}
          <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <a href="event.html?id=${event.id}" aria-label="View ${Utils.esc(event.title)}"
               class="rounded-md border border-gray-400 px-3 py-1.5 text-sm font-semibold">View</a>
            ${cardButtons(event)}
          </div>
        </div>
      </article>`;
  }

  function render() {
    const events = filteredEvents();
    const pageCount = Math.max(1, Math.ceil(events.length / CONFIG.PAGE_SIZE));
    if (currentPage > pageCount) currentPage = pageCount;

    const start = (currentPage - 1) * CONFIG.PAGE_SIZE;
    const pageEvents = events.slice(start, start + CONFIG.PAGE_SIZE);

    $('#result-count').text(events.length + (events.length === 1 ? ' event' : ' events'));

    if (events.length === 0) {
      $('#event-list').html(`<div class="sm:col-span-2 lg:col-span-3">
        ${UI.empty('No events found', 'Try a different search or filter.')}</div>`);
    } else {
      $('#event-list').html(pageEvents.map(eventCard).join(''));
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

  // Page buttons. Focus goes back to the heading so keyboard users start at the top.
  $('#pagination').on('click', 'button', function () {
    currentPage = Number($(this).data('page'));
    render();
    $('h1').focus();
  });

  // Register from a card
  $('#event-list').on('click', '.register-btn', function () {
    const button = $(this);
    const id = button.data('id');
    UI.loading(button, true);
    EventActions.register(id)
      .then(function () {
        myRegistrations[id] = 'registered';
        render();
        $(`#event-list a[href="event.html?id=${id}"]`).focus();   // keep focus on the same card
        UI.toast('You are registered.');
      })
      .fail(function (err) {
        UI.loading(button, false);
        UI.toast(err.message, 'error');
      });
  });

  // Delete from a card (admins)
  $('#event-list').on('click', '.delete-btn', function () {
    const event = allEvents.find(e => e.id === $(this).data('id'));
    EventActions.remove(event, function () {
      allEvents = allEvents.filter(e => e.id !== event.id);
      fillLocations();
      render();
      $('h1').focus();
      UI.toast('Event deleted.');
    });
  });

  // Search and filter always go back to page 1
  $('#search').on('input', Utils.debounce(function () {
    currentPage = 1;
    render();
  }));
  $('#date, #location-filter, #when').on('change', function () {
    currentPage = 1;
    render();
  });

  // Put every filter back to how the page starts
  $('#clear-filters').on('click', function () {
    $('#search').val('');
    $('#date').val('');
    $('#location-filter').val('');
    $('#when').val('upcoming');
    currentPage = 1;
    render();
    $('#search').focus();
  });

  $('#search').val(Utils.qs('q') || '');   // search typed in the header
  // Only set the dropdowns if the query string has a valid value
  if (['upcoming', 'past', 'all'].includes(Utils.qs('when'))) $('#when').val(Utils.qs('when'));
  if (Utils.qs('deleted')) UI.toast('Event deleted.');
  loadEvents();
});