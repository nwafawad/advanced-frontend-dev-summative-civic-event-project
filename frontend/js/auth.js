/* AUTH: stores the logged-in user and token.
   "Keep me signed in" localStorage (survives closing the browser).
   Default sessionStorage (cleared when the tab closes).
   localStorage is less safe: any XSS script could read the token. */
   
const Auth = {

  // Save the token and user after a successful login.
  save(token, user, remember) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(CONFIG.TOKEN_KEY, token);
    storage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  // Find out which storage the token was saved in.
  storage() {
    return localStorage.getItem(CONFIG.TOKEN_KEY) ? localStorage : sessionStorage;
  },

  token() {
    return this.storage().getItem(CONFIG.TOKEN_KEY);
  },

  // The logged-in user, or null if not logged in.
  user() {
    const saved = this.storage().getItem(CONFIG.USER_KEY);
    return saved ? JSON.parse(saved) : null;
  },

  // Update the saved user (used after editing the profile).
  updateUser(user) {
    this.storage().setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  isAdmin() {
    const user = this.user();
    return user !== null && user.role === 'admin';
  },

// When the token expires, the server will reject requests with 401.
// This function decodes the token to find out when it expires.
  expiresAt() {
    const token = this.token();
    if (!token) return 0;
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).exp * 1000;   // convert to milliseconds
    } catch (e) {
      return 0;   // broken token treat as expired
    }
  },

  isLoggedIn() {
    return this.token() !== null && this.expiresAt() > Date.now();
  },

  // Clear everything and go to the login page.
  // reason is shown on the login page, e.g 'expired'.
  logout(reason) {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);

    let url = Utils.page('login.html');
    if (reason) url += '?reason=' + reason;
    location.href = url;
  },

  // Called by api.js when the server answers 401, and by the timer below.
  expire() {
    this.logout('expired');
  },

  /* ROLE GUARD 1: login required 
     Every page except login/signup calls  if (!Auth.requireLogin()) return;
     No token or an expired token, redirect to the login page. */
  requireLogin() {
    if (this.isLoggedIn()) return true;

    if (this.token()) this.expire();   // had a token, but it ran out
    else this.logout();                // never logged in
    return false;
  },

   /* ROLE GUARD 2: admin-only pages
     Used on admin/dashboard, admin/users and the
     event/announcement/promo forms. A normal user sees "You do not have access".
     This is for UX only. The backend's authorize(['admin']) is the real
     security and rejects non-admins with 403. */
  requireAdmin() {
    if (!this.requireLogin()) return false;

    if (!this.isAdmin()) {
      UI.forbidden();
      return false;
    }
    return true;
  },

   /* ===== ROLE GUARD 3: admin-only buttons and links =====
     Elements marked data-admin-only(Edit, Delete, Create) are removed
     from the page for normal users. Removed, not hidden, so they can't be
     shown again from DevTools. */
  applyRoleVisibility() {
    if (!this.isAdmin()) {
      $('[data-admin-only]').remove();
    }
  },
};

// Sign the user out automatically the moment the token expires,
// even if the tab is just left open.
if (Auth.isLoggedIn()) {
  setTimeout(() => Auth.expire(), Auth.expiresAt() - Date.now());
}
