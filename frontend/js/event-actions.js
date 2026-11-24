/* Event actions shared by the events list (events.js) and the event page (event.js). */
const EventActions = {

  // The logged-in user's registrations, as { eventId: 'registered' or 'cancelled' }
  loadMyRegistrations() {
    return Api.get('/event-registrations/my-registrations').then(function (res) {
      const statuses = {};
      res.data.forEach(function (registration) {
        statuses[registration.event_id] = registration.status;
      });
      return statuses;
    });
  },

  register(eventId) {
    return Api.post('/event-registrations/register', { event_id: eventId });
  },

  // The backend keeps the cancelled row, so registering again later returns 409.
  cancel(eventId) {
    return Api.post('/event-registrations/cancel', { event_id: eventId });
  },

  // Ask first, then delete. Calls onDeleted() when it worked.
  remove(event, onDeleted) {
    UI.confirm('Delete this event?', `"${event.title}" will be removed for everyone. This cannot be undone.`, function () {
      Api.del('/events/' + event.id)
        .then(onDeleted)
        .fail(function (err) {
          // The backend refuses to delete events that people registered for
          const message = err.message.includes('foreign key')
            ? 'People are registered for this event, so it cannot be deleted.'
            : err.message;
          UI.toast(message, 'error');
        });
    });
  },

  isPast(event) {
    return new Date(event.ends_at).getTime() < Date.now();
  },
};