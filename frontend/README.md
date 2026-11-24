# CivicEvents+ frontend

The browser side of CivicEvents+, built with **HTML, Tailwind CSS (CDN) and jQuery**. There is no build step and nothing to install.

For the database and backend setup, creating an admin account, the feature list and the known backend limitations, see the main [README](../README.md).

## Run it
1. Start the backend first (see the main README). The API runs at `http://localhost:4000/api`.
2. Serve this folder with any static server:
   - VS Code: right-click `frontend/index.html` and choose **Open with Live Server**, or
   - from the project root: `npx serve frontend`
3. Open the address it gives you. `index.html` sends you to the login page, or, if you are already logged in, to the admin Dashboard (admins) or My dashboard (everyone else).

The API address is set in `js/config.js` (`API_BASE`). Change it if the backend runs somewhere else.

## Pages

| Page | Who can open it | What it does |
|---|---|---|
| `pages/login.html`, `pages/signup.html` | Everyone | Log in, or create a normal user account |
| `pages/dashboard.html` | Normal users | My dashboard: your totals from `GET /dashboard/me` and your next events. Admins are sent to the admin dashboard |
| `pages/events.html` | Logged in | Event list with search, date, location and Upcoming/Past/All filters, and pages. Accepts `?q=` and `?when=` |
| `pages/event.html?id=…` | Logged in | Event details, register/cancel, feedback; attendees and all feedback for admins |
| `pages/announcements.html`, `pages/announcement.html?id=…` | Logged in | Audio announcements and player |
| `pages/promos.html`, `pages/promo.html?id=…` | Logged in | Promo videos with captions and transcript |
| `pages/notifications.html`, `pages/notification.html?id=…` | Logged in | Inbox with read/unread, and one notification with a link to what it is about |
| `pages/profile.html` | Logged in | Change your name and email |
| `pages/my-registrations.html` | Normal users | Your upcoming, past and cancelled registrations |
| `pages/event-form.html`, `pages/announcement-form.html`, `pages/promo-form.html` | Admins | Create and edit (add `?id=…` to edit) with file preview and upload progress |
| `pages/admin/dashboard.html` | Admins | Totals and a new-users-per-month chart |
| `pages/admin/users.html` | Admins | Search users, view a user's profile, and enable/disable accounts |
| `pages/admin/notifications.html` | Admins | Search and filter notifications, view and delete them |

## How the code is organised
Every page loads the shared scripts in this order, then its own script from `js/pages/`:

```
config.js → utils.js → ui.js → api.js → auth.js → layout.js → (event-actions.js) → pages/<page>.js
```
`event-actions.js` is only loaded by the events, event, my registrations and my dashboard pages.

| File | What it does |
|---|---|
| `js/config.js` | Settings: API address, page size, upload limits, storage keys |
| `js/utils.js` | HTML escaping, dates, reading `?id=` from the URL, debounce, file checks |
| `js/ui.js` | Toasts, loading skeletons, empty/error/not-found messages, confirm dialog, field errors |
| `js/api.js` | Every AJAX call goes through here: adds the `Authorization: Bearer` token, turns errors into a message, logs out on 401 |
| `js/auth.js` | Saves the token, logs out when it expires, and the role guards |
| `js/layout.js` | Skip link, header, nav, notification bell, footer and the admin sidebar |
| `js/event-actions.js` | Register, cancel and delete, shared by the event pages |
| `css/app.css` | Focus outline for keyboard users and the fade between pages |

Each page script starts the same way:
```js
$(function () {
  if (!Auth.requireLogin()) return;   // ROLE GUARD 1: not logged in → login page
  Layout.init();                      // header, nav, bell and footer
  if (!Auth.requireAdmin()) return;   // ROLE GUARD 2: admin pages only → "no access" message
  // ...the page's own code
});
```
Admin-only links and buttons are marked `data-admin-only` and removed for normal users by `Auth.applyRoleVisibility()` (ROLE GUARD 3). These guards are for the user experience; the backend checks the role again on every request.

All text that comes from the API is escaped with `Utils.esc()` before it is put into the page.

## Settings (`js/config.js`)

| Setting | Default | Meaning |
|---|---|---|
| `API_BASE` | `http://localhost:4000/api` | Where the backend runs |
| `PAGE_SIZE` | `6` | Events per page |
| `UPLOAD_LIMITS` | images 2 MB (jpg, jpeg, png, gif), audio 5 MB (mp3, wav, m4a, ogg), video 8 MB (mp4, mov, avi, mkv) | Checked before uploading; same limits as the backend |
| `TOKEN_KEY`, `USER_KEY` | `ce_token`, `ce_user` | Where the login is stored |
| `PROMOS_CACHE_KEY` | `ce_promos_cache` | Where the promos list is cached |
| `NOTIFICATION_TYPES` | event, announcement, promo | Labels for notification types |

## What is stored in the browser

| Key | Storage | What it holds |
|---|---|---|
| `ce_token`, `ce_user` | sessionStorage, or localStorage with "Keep me signed in" | The login token and the logged-in user |
| `ce_read_<userId>` | localStorage | IDs of notifications this user has read (the API has no "mark as read") |
| `ce_promos_cache` | sessionStorage | The promos list, kept for 5 minutes and cleared after admin changes |
