/* Login page */

// Already logged in? Skip the login page.
if (Auth.isLoggedIn()) {
  location.href = Auth.isAdmin() ? 'admin/dashboard.html' : 'events.html';
}

// Banner at the top of the card, for messages sent from other pages
function showBanner(text, type) {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
  };
  const icon = type === 'success' ? 'success' : '!';
  $('#page-message').html(`
    <p role="status" class="mb-5 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${styles[type]}">
      <span aria-hidden="true">${icon}</span> ${Utils.esc(text)}
    </p>
  `);
}

if (Utils.qs('registered')) {
  UI.toast('Account created. Log in to continue.');
}
if (Utils.qs('reason') === 'expired') {
  showBanner('Your session expired. Please log in again.', 'warning');
}
if (Utils.qs('reason') === 'disabled') {
  showBanner('This account has been disabled. Contact an administrator for help.', 'warning');
}

// Show / hide password
$('#toggle-password').on('click', function () {
  const field = $('#password');
  const showing = field.attr('type') === 'password';
  field.attr('type', showing ? 'text' : 'password');
  $(this).text(showing ? 'Hide' : 'Show').attr('aria-pressed', showing);
});

// Submit
$('#login-form').on('submit', function (e) {
  e.preventDefault();
  UI.clearErrors(this);

  const email = $('#email').val().trim();
  const password = $('#password').val();
  const remember = $('#remember').is(':checked');

  // Check the fields before calling the server
  let valid = true;
  if (!email)    { UI.fieldError('email', 'Enter your email.');       valid = false; }
  if (!password) { UI.fieldError('password', 'Enter your password.'); valid = false; }
  if (!valid) {
    $('[aria-invalid]').first().focus();
    return;
  }

  // Call the API
  const button = $('#login-btn');
  UI.loading(button, true);

  Api.post('/auth/login', { email, password })
    .then(function (res) {
      Auth.save(res.data.token, res.data.user, remember);
      // ROLE GUARD UI only: the backend does not check is_active when logging in,
      // so we ask for the profile and sign straight out if an admin disabled this account.
      return Api.get('/users/profile/me');
    })
    .then(function (res) {
      if (res.data.is_active === false) return Auth.logout('disabled');
      // Admins go to the dashboard, normal users to the events list
      location.href = res.data.role === 'admin' ? 'admin/dashboard.html' : 'events.html';
    })
    .fail(function (err) {
      $('#form-error').text(err.status === 401 ? 'Wrong email or password.' : err.message);
      UI.loading(button, false);
    });
});
