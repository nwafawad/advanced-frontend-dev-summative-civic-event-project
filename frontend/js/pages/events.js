/* Events page: list, search, filter and pages.
   GET /events ignores query params, so we filter and paginate in the browser. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
  Auth.applyRoleVisibility();   // removes New event for normal users

  let allEvents = [];
  let currentPage = 1;

  function loadEvents() {
    $('#event-list').html(UI.skeleton(CONFIG.PAGE_SIZE));
    Api.get('/events')
      .then(function (res) {
        allEvents = res.data;
        render();
      })
      .fail(function (err) {
        UI.error('#event-list', err.message, loadEvents);
      });
  }

  // Apply the search box and the Upcoming/Past/All filter
  function filteredEvents() {
    const search = $('#search').val().trim().toLowerCase();
    const when = $('#when').val();
    const now = Date.now();

    return allEvents.filter(function (event) {
      // Normal users only see published events. Admins see everything.
      if (!Auth.isAdmin() && event.published === false) return false;

      const text = (event.title + ' ' + event.location).toLowerCase();
      const isPast = new Date(event.ends_at).getTime() < now;
      if (search && !text.includes(search)) return false;
      if (when === 'upcoming' && isPast) return false;
      if (when === 'past' && !isPast) return false;
      return true;
    });
  }

  function eventCard(event) {
    const image = event.metadata && event.metadata.image_url;
    return `
      <article class="overflow-hidden rounded-lg border border-gray-200 bg-white">
        ${image ? `<img src="${Utils.esc(image)}" alt="" class="h-40 w-full object-cover">` : ''}
        <div class="p-4">
          <h2 class="font-semibold">
            <a href="event.html?id=${event.id}" class="hover:underline">${Utils.esc(event.title)}</a>
          </h2>
          <p class="mt-1 text-sm text-muted">${Utils.formatDate(event.starts_at)}</p>
          <p class="text-sm text-muted">${Utils.esc(event.location)}</p>
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

  // Search and filter always go back to page 1
  $('#search').on('input', Utils.debounce(function () {
    currentPage = 1;
    render();
  }));
  $('#when').on('change', function () {
    currentPage = 1;
    render();
  });

  $('#search').val(Utils.qs('q') || '');   // search typed in the header
  loadEvents();
});