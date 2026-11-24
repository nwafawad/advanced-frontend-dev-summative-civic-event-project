/* My profile: account details, and a form to change name or email.
   The API does not allow changing role, status or password here. */
$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();

  function showAccount(user) {
    const since = new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    $('#account-info').html(`
      <div><dt class="text-muted">Role</dt><dd class="font-semibold capitalize">${Utils.esc(user.role)}</dd></div>
      <div><dt class="text-muted">Status</dt><dd class="font-semibold">${user.is_active ? 'Active' : 'Disabled'}</dd></div>
      <div><dt class="text-muted">Member since</dt><dd class="font-semibold">${since}</dd></div>`);
  }

  function load() {
    UI.loading($('#save-btn'), true);
    Api.get('/users/profile/me')
      .then(function (res) {
        $('#full_name').val(res.data.full_name);
        $('#email').val(res.data.email);
        showAccount(res.data);
        UI.loading($('#save-btn'), false);
      })
      .fail(function (err) {
        $('#form-error').text(err.message);
      });
  }

  $('#profile-form').on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors(this);

    const fullName = $('#full_name').val().trim();
    const email = $('#email').val().trim();

    let valid = true;
    if (!fullName) { UI.fieldError('full_name', 'Enter your full name.'); valid = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { UI.fieldError('email', 'Enter a valid email, like you@example.com.'); valid = false; }
    if (!valid) {
      $('[aria-invalid]').first().focus();
      return;
    }

    const button = $('#save-btn');
    UI.loading(button, true);
    // ROLE GUARD UI only: only name and email are sent. Role and status are shown read-only
    // and never sent, so users cannot change their own role or re-enable a disabled account.
    Api.patch('/users/profile/me', { full_name: fullName, email: email })
      .then(function (res) {
        // Keep the saved user in step, so the header shows the new name straight away
        Auth.updateUser(Object.assign(Auth.user(), { full_name: res.data.full_name, email: res.data.email }));
        $('#header-name').text(res.data.full_name);
        UI.loading(button, false);
        UI.toast('Your profile has been saved.');
      })
      .fail(function (err) {
        UI.loading(button, false);
        if (err.status === 409) {
          UI.fieldError('email', 'That email is already used by another account.');
          $('#email').focus();
        } else {
          $('#form-error').text(err.message);
        }
      });
  });

  load();
});
