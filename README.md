# CivicEvents+ – Accessible City Events & Services Portal

A multi-page web app for the CivicEvents+ API. Residents can browse and register for city events, rate them, listen to audio announcements, watch captioned promo videos and get notifications. Admins manage events, announcements, promos, notifications and user accounts.

Built with **HTML, Tailwind CSS (CDN) and jQuery** only. There is no build step.

## Project structure

```
backend/               Provided Node.js / Express / PostgreSQL API
frontend/
  index.html           Sends you to login, or to your dashboard (admin or user)
  css/app.css          Focus outline for keyboard users, fade between pages
  js/
    config.js          API base URL, upload limits, cache keys
    utils.js           HTML escaping, dates, query string, debounce, file checks
    ui.js              Toasts, skeletons, empty/error states, confirm dialog
    api.js             AJAX wrapper: adds the Bearer token, handles 401/403/500
    auth.js            Token storage, auto logout, role guards
    layout.js          Header, nav, notification bell, footer, admin sidebar
    event-actions.js   Register / cancel / delete, shared by the event pages
    pages/             One script per page
  pages/               Login, signup, my dashboard, events, announcements, promos, notifications, profile, my registrations
  pages/admin/         Dashboard, users and notifications (admins only)
```

## Running it locally

### 1. Requirements
- Node.js 18 or newer
- PostgreSQL 15 or newer (with `psql` or pgAdmin)
- Something to serve static files: the VS Code **Live Server** extension, or `npx serve`

### 2. Database
1. Create the database. The name contains hyphens, so it needs double quotes:
   ```sql
   CREATE DATABASE "civic-events-db";
   ```
2. Create the tables (this also enables the `uuid-ossp` extension):
   ```bash
   cd backend
   psql -U <db-user> -h localhost -p 5432 -d civic-events-db -f migrations/001_create_tables.sql
   ```
   There is no seed data (`npm run db:seed` points to a file that does not exist), so you start with an empty database.

### 3. Backend environment variables
Create `backend/.env`:

```
DB_USER=postgres
DB_PASS=<your-database-password>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic-events-db
JWT_SECRET=<any-long-random-string>
PORT=4000
```

| Variable | Meaning |
|---|---|
| `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME` | PostgreSQL connection. The server reads **`DB_PASS`**, not `DB_PASSWORD` as `backend/README.md` says |
| `JWT_SECRET` | Secret used to sign login tokens. Tokens last 1 hour |
| `PORT` | API port, 4000 by default |

### 4. Start the backend
```bash
cd backend
npm install
npm run dev        # or: npm start
```
Start it **from inside `backend/`**. Uploaded images, audio and video are saved to `backend/uploads/` relative to the folder you start it from, and served at `http://localhost:4000/uploads/...`.

The API base URL is **`http://localhost:4000/api`**.

### 5. Start the frontend
Nothing to install or build. Either:
- open the project in VS Code, right-click `frontend/index.html` and choose **Open with Live Server**, or
- run `npx serve frontend` and open the address it prints.

The frontend calls the API set in `frontend/js/config.js`:
```js
API_BASE: 'http://localhost:4000/api',
```
Change it if the backend runs somewhere else. CORS is already enabled in the backend.

### 6. Create an admin account
The signup page always creates normal users. The API's signup endpoint also accepts a `role` field, so the first admin is created by calling it directly, with Postman or curl.

The password must be **at least 8 characters** and include an **uppercase letter, a lowercase letter, a number and a special character**, for example `ChangeMe123!` (choose your own).

#### Option A: Postman
1. In Postman, choose **Import** and select `backend/CivicEvents+ API.postman_collection.json`.
2. The collection's `base_url` variable is set to `http://localhost:5000`, but the server runs on port **4000**. Click the collection, open the **Variables** tab, set `base_url` to `http://localhost:4000` and save.
3. Open **Auth → Register User** (`POST {{base_url}}/api/auth/signup`).
4. In **Body → raw → JSON**, enter:
   ```json
   {
     "full_name": "City Admin",
     "email": "admin@example.com",
     "password": "ChangeMe123!",
     "role": "admin"
   }
   ```
5. Click **Send**. You should get **201 Created** with `"role": "admin"` in the response.

#### Option B: curl
macOS/Linux terminal or Git Bash on Windows:
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"full_name":"City Admin","email":"admin@example.com","password":"ChangeMe123!","role":"admin"}'
```
Windows PowerShell:
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/signup -ContentType 'application/json' -Body '{"full_name":"City Admin","email":"admin@example.com","password":"ChangeMe123!","role":"admin"}'
```
A successful response looks like this:
```json
{"status":201,"message":"User created successfully","data":{"id":"...","full_name":"City Admin","email":"admin@example.com","role":"admin"}}
```

#### If it fails
| Response | What to do |
|---|---|
| `400` "Password must be at least 8 characters long…" | Use a password with upper and lower case letters, a number and a special character |
| `400` "Valid email is required" | Check the email address |
| `409` "Email already in use" | Use another email, or make that account an admin as shown below |
| Could not connect | Check that the backend is running and the port is 4000 |

#### Already signed up through the form?
Make that account an admin in `psql` or pgAdmin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```
Then log out and log in again, because the role is stored in the login token.

Log in with the admin email on the login page and you will land on the admin Dashboard. Normal users land on their own dashboard (My dashboard).

## Features

**Every logged-in user**
- Sign up and log in with field validation, show/hide password and "Keep me signed in"
- Events: search (also from the header), filters by date, location and Upcoming / Past / All, a Clear filters button, pages of 6, details with a map link, register and cancel
- Feedback: rate an event from 1 to 5 with a comment, and edit your own rating
- Announcements: audio list and detail page, with only one playing at a time
- Promos: videos with captions built from the caption text, a Captions on/off button and a transcript
- Notifications: bell with unread count and the latest 5, inbox with an unread filter, "Mark as read" and "Mark all as read", and a detail page linking to the event, announcement or promo
- Profile: change your name and email

**Normal users**
- My dashboard (`GET /dashboard/me`): your registrations, feedback given and notifications (with unread), your next 3 events, and Refresh. This is where you land after logging in
- My registrations: upcoming, past and cancelled, with Cancel

**Admins**
- Dashboard: totals and a new-users-per-month chart, with Refresh
- Users: search, status filter, view a user's profile (`GET /users/:id`), enable/disable (disabled users cannot log in)
- Events: create and edit with image preview and upload progress, delete, attendee list, all feedback with the average rating
- Announcements: upload audio with preview and progress, publish/unpublish, delete
- Promos: upload video with preview and progress, caption text, publish/unpublish, delete
- Notifications: a Notifications page in the admin panel with search, type filter, View and Delete. Admins can also delete from the inbox and the detail page. A deleted item disappears at once and comes back if the server refuses

## Roles and route guards
The guards are marked in the code with `ROLE GUARD` comments.

| Guard | Where | What it does |
|---|---|---|
| 1. Login required | `Auth.requireLogin()` in `js/auth.js`, called first by every page script | No token, or an expired one, sends you to the login page |
| 2. Admin-only pages | `Auth.requireAdmin()` in `js/auth.js` | On the admin dashboard, users and notifications pages and the event/announcement/promo forms, normal users see "You do not have access to this page" |
| 3. Admin-only links and buttons | `Auth.applyRoleVisibility()` removes `[data-admin-only]` elements; nav links marked `adminOnly` / `userOnly` in `js/layout.js` | Normal users never see admin actions. Admins do not see the user-only links (My dashboard, My registrations), and opening My dashboard as an admin sends you to the admin dashboard |
| UI-only checks | `ROLE GUARD (UI only)` comments in page scripts | Edit/Delete/Publish buttons only for admins, the disabled-account check at login, hiding other users' direct notifications |

These guards improve the user experience; they are not security. The real protection is the backend's `authorize(['admin'])`, which answers **403**, and the frontend shows that as a message.

## Login and token storage
- The token from `POST /auth/login` is saved in **sessionStorage**, which is cleared when the tab closes. With "Keep me signed in" it goes in **localStorage** instead.
- Trade-off: any script on the page can read browser storage, so an XSS bug could steal the token. To reduce the risk, all text from the API is escaped (`Utils.esc`) before it is put on the page. httpOnly cookies would be safer but need backend changes.
- Every request sends `Authorization: Bearer <token>` (`js/api.js`).
- The browser reads the token's expiry time. When the token runs out (after 1 hour) the user is logged out with "Your session expired". Any 401 from the API does the same.

## Accessibility
- Skip link, landmarks (`header`, `nav`, `main`, `footer`), one `<h1>` and its own title on every page
- A label on every field, required fields marked, errors linked with `aria-describedby` and `aria-invalid`, and focus moves to the first error
- Visible focus outline. After a list changes, focus moves to the heading, and after a dialog closes it returns to the button that opened it. Escape closes menus and dialogs, and Tab stays inside the confirm dialog
- Toasts are read out by screen readers (`aria-live`), and busy buttons say "Please wait..."
- Audio and video use native keyboard controls, with download links if a file cannot play. Promos have captions on by default, an on/off button and a transcript
- The dashboard chart has a screen-reader table with the same numbers
- Colors meet WCAG AA contrast. Loading animations stop when "reduce motion" is on
- Pages fade into each other in supported browsers, but switch instantly when "reduce motion" is on
- Responsive from 360px wide: cards go from 1 to 3 columns, and tables scroll sideways on phones

## Performance
- Promo thumbnails load only when they scroll into view (IntersectionObserver), and event images use `loading="lazy"`
- The promos list is cached in sessionStorage for 5 minutes and cleared after admin changes
- Search waits until you stop typing (debounce)
- Files are checked for type and size before uploading

## Known backend limitations
The provided backend was not changed. These come from it, not from the frontend:

**Accounts**
- `POST /auth/signup` accepts a `role` field, so anyone can create an admin through the API. The signup form never sends it.
- Login does not check whether an account is disabled. The frontend checks right after login and signs disabled users out, but someone already logged in keeps access until their token expires (1 hour).
- `GET /users` returns no total count, so the users page loads everyone and pages in the browser.
- There is no endpoint to change a password.
- `GET /dashboard/me` counts unread notifications from a `read` column that nothing ever updates, so My dashboard shows the unread count from the browser instead (same as the bell). Its registrations total includes cancelled registrations, so the card also shows how many are upcoming.

**Events**
- The `published` field is ignored on create and update, so every event is saved as published.
- `GET /events` ignores query parameters, so search, filters and pages work in the browser. There is no list of locations either, so the Location filter is built from the loaded events.
- Cancelling keeps the registration row, so registering again for the same event fails (409). The UI says "You cancelled your registration" and hides Register.
- Deleting an event that has registrations fails (foreign key). The UI explains why.
- Deleting an event leaves its image file in `backend/uploads/events/`.
- Only admins can read an event's feedback list and average, so normal users only see their own rating.

**Announcements and promos**
- Announcements have no duration or transcript fields. The length is read from the audio file, and the page says no transcript was provided.
- Editing an announcement cannot replace its audio, so the edit form only changes the title and published status.
- Creating an announcement sends a notification to everyone even when it is saved as a draft.
- Promos store plain `caption_text` only. The frontend turns it into a WebVTT captions file in the browser (one line = one caption, spread evenly over the video).
- New promos are always published. If "Published" is off, the frontend unpublishes the promo right after creating it.
- Deleting an announcement or promo, or replacing a promo video, leaves the old file in `backend/uploads/`.

**Notifications**
- There is no route to send a notification by hand. They are only created automatically (new event, new or published announcement or promo), so the admin Notifications page can only view and delete them.
- `GET /notifications` returns only notifications sent to everyone plus the caller's own, even for admins, so admins cannot see or delete notifications targeted at another user.
- There is no "mark as read" endpoint, so read/unread is stored per user in the browser (localStorage).
- `GET /notifications/:id` does not check who the notification is for, so the frontend hides direct notifications meant for someone else.
- Deleting an event, announcement or promo leaves its notifications, so their link leads to a "not found" page.

**Other**
- The brief mentions "service requests", but the API has no endpoint for them.
- Dashboard counts come back as text, and months with no sign-ups are missing from `user_growth`. The frontend converts the numbers and fills the gaps with 0.