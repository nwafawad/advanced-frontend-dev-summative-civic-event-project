/* LAYOUT: shared skip link, header and footer for every logged-in page.
   Each page script calls Layout.init() after Auth.requireLogin(). */

const Layout = {

  // Main nav. adminOnly links are only shown to admins, userOnly links only to normal users.
  links: [
    { file: 'dashboard.html',           label: 'Dashboard',          userOnly: true },
    { file: 'events.html',              label: 'Events' },
    { file: 'announcements.html',       label: 'Announcements' },
    { file: 'promos.html',              label: 'Promos' },
    { file: 'my-registrations.html',    label: 'My registrations',   userOnly: true },
    { file: 'admin/dashboard.html',     label: 'Dashboard',          adminOnly: true },
    { file: 'admin/users.html',         label: 'Users',              adminOnly: true },
  ],

  init() {
    $('body').addClass('flex min-h-screen flex-col')
      .prepend(this.header())
      .append(this.footer());
    // tabindex="-1" lets the skip link move focus into <main> in every browser
    $('#main').attr('tabindex', '-1').addClass('mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none');
    this.bindEvents();
    this.loadUnreadCount();
  },

  // Nav links. The current page gets aria-current="page".
  navLinks() {
    return this.links
      // adminOnly links are for admins, userOnly links for normal users (admins cannot register for events)
      .filter(link => (!link.adminOnly || Auth.isAdmin()) && (!link.userOnly || !Auth.isAdmin()))
      .map(link => {
        const current = location.pathname.endsWith('/' + link.file);
        return `
          <a href="${Utils.page(link.file)}" ${current ? 'aria-current="page"' : ''}
             class="rounded-md px-3 py-2 text-sm font-semibold hover:bg-brand-tint
                    ${current ? 'bg-brand-tint text-brand' : 'text-muted'}">${link.label}</a>`;
      })
      .join('');
  },

  /* Admin sidebar and its links */
  adminSidebar() {
    const links = [
      { file: 'admin/dashboard.html',   label: 'Dashboard' },
      { file: 'admin/users.html',       label: 'Users' },
      { file: 'admin/notifications.html', label: 'Notifications' },
      { file: 'event-form.html',        label: 'New event' },
      { file: 'announcement-form.html', label: 'New announcement' },
      { file: 'promo-form.html',        label: 'New promo' },
    ];
    const items = links.map(function (link) {
      const current = location.pathname.endsWith('/' + link.file);
      return `
        <a href="${Utils.page(link.file)}" ${current ? 'aria-current="page"' : ''}
           class="rounded-md px-3 py-2 text-sm font-semibold hover:bg-brand-tint
                  ${current ? 'bg-brand-tint text-brand' : 'text-muted'}">${link.label}</a>`;
    }).join('');

    $('#main')
      .addClass('md:grid md:grid-cols-[12rem_1fr] md:gap-8')
      .wrapInner('<div class="min-w-0"></div>')
      .prepend(`
        <nav aria-label="Admin" class="mb-6 md:mb-0">
          <p class="px-3 text-xs font-semibold uppercase tracking-wide text-muted">Admin</p>
          <div class="mt-2 flex flex-wrap gap-1 md:flex-col">${items}</div>
        </nav>`);
  },

  header() {
    const user = Auth.user();
    return `
      <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                             focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to main content
      </a>

      <header class="border-b border-gray-200 bg-white">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">

          <a href="${Utils.page('events.html')}" class="mr-4 flex items-center gap-2 font-semibold">
            <!-- Icon: Heroicons "building-library" (outline), MIT licence, heroicons.com -->
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"/>
            </svg>
            CivicEvents+
          </a>

          <!-- Bell: opens a small panel with the latest notifications -->
          <div class="relative ml-auto md:order-3">
            <button type="button" id="bell-btn" aria-expanded="false" aria-controls="bell-panel" aria-label="Notifications"
                    class="relative rounded-md p-2 hover:bg-brand-tint">
              <!-- Icon: Heroicons "bell" (outline), MIT licence, heroicons.com -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/>
              </svg>
              <span id="unread-badge" aria-hidden="true"
                    class="absolute -right-1 -top-1 hidden rounded-full bg-red-700 px-1.5 text-xs font-bold text-white"></span>
            </button>
            <!-- On phones the panel spans the screen, from md up it hangs under the bell -->
            <div id="bell-panel" class="fixed left-4 right-4 top-16 z-20 hidden rounded-md border border-gray-200 bg-white shadow-md
                                        md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80">
              <p class="border-b border-gray-200 px-4 py-2 text-sm font-semibold">Latest notifications</p>
              <ul id="bell-list">
                <li class="px-4 py-3 text-sm text-muted">Loading...</li>
              </ul>
              <a href="${Utils.page('notifications.html')}"
                 class="block border-t border-gray-200 px-4 py-2 text-center text-sm font-semibold text-brand hover:bg-brand-tint">See all notifications</a>
            </div>
          </div>

          <!-- Profile menu (a simple show/hide button, not an ARIA "menu") -->
          <div class="relative md:order-4">
            <button type="button" id="profile-btn" aria-expanded="false" aria-controls="profile-menu"
                    class="flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold hover:bg-brand-tint">
              <span id="header-name">${Utils.esc(user.full_name)}</span>
              <!-- Icon: Heroicons "chevron-down" (outline), MIT licence, heroicons.com -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
              </svg>
            </button>
            <div id="profile-menu" class="absolute right-0 z-20 mt-2 hidden w-48 rounded-md border border-gray-200 bg-white py-1 shadow-md">
              <p class="px-4 py-2 text-xs text-muted">Signed in as ${user.role}</p>
              <a href="${Utils.page('profile.html')}" class="block px-4 py-2 text-sm hover:bg-brand-tint">Profile</a>
              <button type="button" id="logout-btn" class="block w-full px-4 py-2 text-left text-sm hover:bg-brand-tint">Log out</button>
            </div>
          </div>

          <!-- Menu button, phones only -->
          <button type="button" id="menu-btn" aria-expanded="false" aria-controls="main-nav"
                  class="rounded-md p-2 hover:bg-brand-tint md:hidden">
            <span class="sr-only">Menu</span>
            <!-- Icon: Heroicons "bars-3" (outline), MIT licence, heroicons.com -->
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
            </svg>
          </button>

          <nav id="main-nav" aria-label="Main" class="hidden w-full md:order-1 md:block md:w-auto">
            <div class="flex flex-col gap-1 pt-2 md:flex-row md:pt-0">${this.navLinks()}</div>
          </nav>

          <!-- Global search: sends the words to the Events page as ?q= -->
          <form role="search" action="${Utils.page('events.html')}" class="w-full md:order-2 md:w-auto">
            <label for="global-search" class="sr-only">Search events</label>
            <input id="global-search" name="q" type="search" placeholder="Search events"
                   value="${Utils.esc(Utils.qs('q') || '')}"
                   class="w-full rounded-md border border-gray-400 px-3 py-1.5 text-sm md:w-56">
          </form>
        </div>
      </header>`;
  },

  footer() {
    return `
      <footer class="border-t border-gray-200 px-6 py-5 text-center text-xs text-muted">
        Help and contact: <a href="mailto:help@civicevents.com" class="underline">help@civicevents.com</a>
        <span class="mx-3" aria-hidden="true">·</span>
        <a href="#" class="underline">Accessibility statement</a>
      </footer>`;
  },

  bindEvents() {
    // Phone menu
    $('#menu-btn').on('click', function () {
      const open = $(this).attr('aria-expanded') === 'true';
      $(this).attr('aria-expanded', !open);
      $('#main-nav').toggleClass('hidden', open);
    });

    // Profile menu
    $('#profile-btn').on('click', function () {
      const open = $(this).attr('aria-expanded') === 'true';
      $(this).attr('aria-expanded', !open);
      $('#profile-menu').toggleClass('hidden', open);
    });

    // Notifications panel. It is drawn each time it opens, so read/unread is up to date.
    $('#bell-btn').on('click', function () {
      const open = $(this).attr('aria-expanded') === 'true';
      if (!open) Layout.renderBellPanel();
      $(this).attr('aria-expanded', !open);
      $('#bell-panel').toggleClass('hidden', open);
    });

    // Escape closes whichever one is open and puts focus back on its button
    $(document).on('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('#profile-btn').attr('aria-expanded') === 'true') {
        Layout.closeProfileMenu();
        $('#profile-btn').focus();
      }
      if ($('#bell-btn').attr('aria-expanded') === 'true') {
        Layout.closeBellPanel();
        $('#bell-btn').focus();
      }
    });

    // Clicking anywhere else closes them
    $(document).on('click', function (e) {
      if (!$(e.target).closest('#profile-btn, #profile-menu').length) Layout.closeProfileMenu();
      if (!$(e.target).closest('#bell-btn, #bell-panel').length) Layout.closeBellPanel();
    });

    $('#logout-btn').on('click', () => Auth.logout());
  },

  closeProfileMenu() {
    $('#profile-btn').attr('aria-expanded', 'false');
    $('#profile-menu').addClass('hidden');
  },

  closeBellPanel() {
    $('#bell-btn').attr('aria-expanded', 'false');
    $('#bell-panel').addClass('hidden');
  },

  /* NOTIFICATIONS AND UNREAD COUNT
     The backend has no "mark as read", so we keep the IDs of notifications
     this user has read in localStorage */
  notifications: null,   // filled by loadUnreadCount(); null while still loading

  readKey() {
    return 'ce_read_' + Auth.user().id;
  },

  readIds() {
    try {
      return JSON.parse(localStorage.getItem(this.readKey())) || [];
    } catch (e) {
      return [];
    }
  },

  isRead(id) {
    return this.readIds().includes(id);
  },

  markRead(id) {
    const ids = this.readIds();
    if (!ids.includes(id)) ids.push(id);
    localStorage.setItem(this.readKey(), JSON.stringify(ids));
  },

  loadUnreadCount() {
    Api.get('/notifications').then(function (res) {
      Layout.notifications = res.data;
      Layout.setBadge(res.data.filter(n => !Layout.isRead(n.id)).length);
    });
  },

  // The 5 newest notifications, for the bell panel
  renderBellPanel() {
    if (!this.notifications) return;   // still loading: keep "Loading..."
    const latest = this.notifications.slice(0, 5);
    if (latest.length === 0) {
      $('#bell-list').html('<li class="px-4 py-3 text-sm text-muted">No notifications yet.</li>');
      return;
    }
    $('#bell-list').html(latest.map(function (n) {
      const unread = !Layout.isRead(n.id);
      return `
        <li>
          <a href="${Utils.page('notification.html?id=' + n.id)}" class="block border-b border-gray-100 px-4 py-3 text-sm hover:bg-brand-tint">
            <span class="flex items-center gap-2 ${unread ? 'font-semibold' : ''}">
              ${unread ? '<span class="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true"></span><span class="sr-only">Unread:</span>' : ''}
              ${Utils.esc(n.title)}
            </span>
            <span class="mt-0.5 block text-muted line-clamp-2">${Utils.esc(n.message)}</span>
            <span class="mt-0.5 block text-xs text-muted">${Utils.timeAgo(n.created_at)}</span>
          </a>
        </li>`;
    }).join(''));
  },

  setBadge(count) {
    $('#unread-badge').text(count > 9 ? '9+' : count).toggleClass('hidden', count === 0);
    $('#bell-btn').attr('aria-label', count ? `Notifications, ${count} unread` : 'Notifications');
  },
};
