/* Shared UI helpers: toasts, loading, empty/error states, confirm dialog. */
const UI = {

  // Show a small message in the bottom-right corner for 4 seconds.
  toast(message, type = 'success') {
    const colors = {
        success: 'bg-green-50 text-green-800',
        error:   'bg-red-50 text-red-800',
        warning: 'bg-amber-50 text-amber-900',
        info:    'bg-sky-50 text-sky-900',
    };


    // Create the toast area once. aria-live makes screen readers read new toasts.
    if ($('#toast-area').length === 0) {
      $('body').append('<div id="toast-area" role="status" aria-live="polite" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-72"></div>');
    }

    const toast = $(`
      <div class="flex items-start gap-3 rounded-md px-4 py-3 shadow ${colors[type]}">
        <p class="flex-1 text-sm">${Utils.esc(message)}</p>
        <button type="button" aria-label="Close message">&times;</button>
      </div>
    `);

    toast.find('button').on('click', () => toast.remove());
    $('#toast-area').append(toast);
    setTimeout(() => toast.remove(), 4000);
  },

  // Grey placeholder boxes shown while data is loading.
  skeleton(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += '<div class="h-48 rounded-lg bg-gray-200 animate-pulse" aria-hidden="true"></div>';
    }
    return html;
  },

  // Message shown when a list has no items.
  empty(title, text) {
    return `
      <div class="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p class="font-semibold">${Utils.esc(title)}</p>
        <p class="mt-1 text-sm text-muted">${Utils.esc(text)}</p>
      </div>
    `;
  },

  // Red error box with a Try again button.
  error(container, message, retry) {
    $(container).html(`
      <div role="alert" class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p class="font-semibold text-red-800">${Utils.esc(message)}</p>
        <button type="button" class="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm text-white">Try again</button>
      </div>
    `);
    $(container).find('button').on('click', retry);
  },

  // Show an error under a field. The field needs a <p id="FIELD-error"> under it.
  fieldError(fieldId, message) {
    $('#' + fieldId).attr('aria-invalid', 'true').addClass('border-red-700');
    $('#' + fieldId + '-error').text(message);
  },

  // Clear every error message inside a form.
  clearErrors(form) {
    $(form).find('[aria-invalid]').removeAttr('aria-invalid').removeClass('border-red-700');
    $(form).find('[id$="-error"]').text('');
  },

  // Shown when a normal user opens an admin-only page.
  forbidden() {
    $('main').html(`
      <div role="alert" class="mx-auto mt-16 max-w-md rounded-lg border bg-white p-6 text-center">
        <h1 class="text-lg font-semibold">You do not have access to this page</h1>
        <p class="mt-2 text-sm text-muted">This page is for administrators. Contact an administrator if you need access.</p>
        <a href="events.html" class="mt-4 inline-block text-brand underline">Go back to events</a>
      </div>
    `);
  },

  // Turn a button's loading state on or off.
  loading(button, isLoading) {
    if (isLoading) {
      button.data('text', button.text());
      button.prop('disabled', true).attr('aria-busy', 'true').text('Please wait...');
    } else {
      button.prop('disabled', false).removeAttr('aria-busy').text(button.data('text'));
    }
  },

  // Ask are you sure?. calls onConfirm only if the user clicks the red button.
  confirm(title, text, onConfirm) {
    const lastFocused = document.activeElement;

    const dialog = $(`
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
             class="w-full max-w-sm rounded-lg bg-white p-6">
          <h2 id="confirm-title" class="text-lg font-semibold">${Utils.esc(title)}</h2>
          <p class="mt-2 text-sm text-muted">${Utils.esc(text)}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="cancel rounded-md border px-4 py-2 text-sm">Cancel</button>
            <button type="button" class="ok rounded-md bg-red-700 px-4 py-2 text-sm text-white">Confirm</button>
          </div>
        </div>
      </div>
    `);

    function close() {
      dialog.remove();
      $(document).off('keydown.confirm');
      lastFocused.focus();
    }

    dialog.find('.cancel').on('click', close);
    dialog.find('.ok').on('click', () => { close(); onConfirm(); });
    $(document).on('keydown.confirm', (e) => { if (e.key === 'Escape') close(); });

    $('body').append(dialog);
    dialog.find('.cancel').focus();
  },
};
