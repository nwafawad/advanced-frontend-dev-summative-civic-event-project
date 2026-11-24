/* Signup page */

// Already logged in? No need to sign up. Go to the right dashboard.
if (Auth.isLoggedIn()) {
  location.href = Auth.isAdmin() ? 'admin/dashboard.html' : 'dashboard.html';
}

// The 5 password rules. Same policy the backend enforces.
const RULES = {
  length:  (pw) => pw.length >= 8,
  upper:   (pw) => /[A-Z]/.test(pw),
  lower:   (pw) => /[a-z]/.test(pw),
  number:  (pw) => /\d/.test(pw),
  special: (pw) => /[\W_]/.test(pw),
};

// Label and colour for 0–5 rules passed
const LEVELS = [
  { label: 'Not set', color: '' },
  { label: 'Weak',    color: 'bg-red-700' },
  { label: 'Weak',    color: 'bg-red-700' },
  { label: 'Fair',    color: 'bg-amber-600' },
  { label: 'Good',    color: 'bg-sky-700' },
  { label: 'Strong',  color: 'bg-green-700' },
];

// Tick the rules, fill the bars, and return how many rules pass
function checkPassword(password) {
  let passed = 0;

  $('#password-rules li').each(function () {
    const ok = RULES[$(this).data('rule')](password);
    if (ok) passed++;
    $(this).toggleClass('text-green-700', ok);
    $(this).find('.icon').text(ok ? '✓' : '○');
  });

  // Fill one bar for each rule that passes
  $('.strength-bar').each(function (index) {
    $(this)
      .removeClass('bg-gray-200 bg-red-700 bg-amber-600 bg-sky-700 bg-green-700')
      .addClass(index < passed ? LEVELS[passed].color : 'bg-gray-200');
  });
  $('#strength-label').text(LEVELS[passed].label);

  return passed;
}

// Update the meter while typing
$('#password').on('input', function () {
  checkPassword($(this).val());
});

// Submit
$('#signup-form').on('submit', function (e) {
  e.preventDefault();
  UI.clearErrors(this);

  const fullName = $('#full_name').val().trim();
  const email = $('#email').val().trim();
  const password = $('#password').val();
  const confirmPassword = $('#confirm_password').val();

  // Check every field
  let valid = true;
  if (!fullName) {
    UI.fieldError('full_name', 'Enter your full name.'); valid = false;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    UI.fieldError('email', 'Enter a valid email, like you@example.com.'); valid = false;
  }
  if (checkPassword(password) < 5) {
    UI.fieldError('password', 'Your password must meet all 5 rules.'); valid = false;
  }
  if (confirmPassword !== password) {
    UI.fieldError('confirm_password', 'Passwords do not match.'); valid = false;
  }
  if (!valid) {
    $('[aria-invalid]').first().focus();
    return;
  }

  // Create the account. Never send "role": everyone signs up as a normal user.
  const button = $('#signup-btn');
  UI.loading(button, true);

  Api.post('/auth/signup', { full_name: fullName, email: email, password: password })
    .then(function () {
      location.href = 'login.html?registered=1';
    })
    .fail(function (err) {
      if (err.status === 409) {
        UI.fieldError('email', 'This email is already registered. Try logging in.');
        $('#email').focus();
      } else {
        $('#form-error').text(err.message);
      }
      UI.loading(button, false);
    });
});
