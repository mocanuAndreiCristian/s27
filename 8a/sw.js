// =============================================
//  Service Worker — Orar 8A
//  Scope: /s27/8a/
// =============================================

const CACHE_NAME = 'orar-8a-v1';

// All static assets to pre-cache on install
const PRECACHE_ASSETS = [
  // This page
  '/s27/8a/',
  '/s27/8a/index.html',
  '/s27/8a/manifest.json',
  '/s27/8a/icons/icon-192.png',
  '/s27/8a/icons/icon-512.png',

  // JavaScript
  '/s27/js/app.js',
  '/s27/js/theme-bootstrap.js',
  '/s27/js/core/app-data.js',
  '/s27/js/core/color.js',
  '/s27/js/core/config.js',
  '/s27/js/core/data-service.js',
  '/s27/js/core/dom.js',
  '/s27/js/core/events.js',
  '/s27/js/core/legacy-globals.js',
  '/s27/js/core/storage.js',
  '/s27/js/core/text.js',
  '/s27/js/core/time.js',
  '/s27/js/library/library-controller.js',
  '/s27/js/library/library-view.js',
  '/s27/js/manuals/manual-actions.js',
  '/s27/js/manuals/manual-matcher.js',
  '/s27/js/manuals/manuals-model.js',
  '/s27/js/manuals/manuals-store.js',
  '/s27/js/manuals/recommended-manuals.js',
  '/s27/js/mobile/bottom-sheet.js',
  '/s27/js/mobile/mobile-clock.js',
  '/s27/js/mobile/mobile-controller.js',
  '/s27/js/mobile/mobile-layouts.js',
  '/s27/js/mobile/mobile-nav-controller.js',
  '/s27/js/mobile/mobile-state.js',
  '/s27/js/mobile/shortcuts.js',
  '/s27/js/overlays/info-overlay.js',
  '/s27/js/overlays/overlay-manager.js',
  '/s27/js/settings/customization-base-controls.js',
  '/s27/js/settings/customization-controller.js',
  '/s27/js/settings/customization-events.js',
  '/s27/js/settings/customization-fonts.js',
  '/s27/js/settings/customization-settings.js',
  '/s27/js/settings/customization-state.js',
  '/s27/js/settings/customization-view.js',
  '/s27/js/settings/dev-mode.js',
  '/s27/js/settings/presets.js',
  '/s27/js/settings/settings-store.js',
  '/s27/js/settings/theme-engine.js',
  '/s27/js/timetable/current-highlight.js',
  '/s27/js/timetable/schedule-utils.js',
  '/s27/js/timetable/timetable-controller.js',
  '/s27/js/timetable/timetable-interactions.js',
  '/s27/js/timetable/timetable-renderer.js',
  '/s27/js/todo/todo-calendar.js',
  '/s27/js/todo/todo-constants.js',
  '/s27/js/todo/todo-controller.js',
  '/s27/js/todo/todo-filters.js',
  '/s27/js/todo/todo-modals.js',
  '/s27/js/todo/todo-notifications.js',
  '/s27/js/todo/todo-renderer.js',
  '/s27/js/todo/todo-store.js',
  '/s27/js/ui/release-notes.js',
  '/s27/js/ui/scrollbars.js',
  '/s27/js/ui/touch-guard.js',
  '/s27/js/weather/clock-controller.js',
  '/s27/js/weather/weather-controller.js',
  '/s27/js/weather/weather-service.js',

  // CSS
  '/s27/css/app.css',
  '/s27/css/core/accessibility.css',
  '/s27/css/core/animations.css',
  '/s27/css/core/components.css',
  '/s27/css/core/index.css',
  '/s27/css/core/reset.css',
  '/s27/css/core/scrollbars.css',
  '/s27/css/core/tokens.css',
  '/s27/css/features/index.css',
  '/s27/css/features/library/catalog.css',
  '/s27/css/features/library/index.css',
  '/s27/css/features/library/modals.css',
  '/s27/css/features/library/overlay.css',
  '/s27/css/features/library/responsive.css',
  '/s27/css/features/manuals/actions.css',
  '/s27/css/features/manuals/index.css',
  '/s27/css/features/manuals/recommendations.css',
  '/s27/css/features/mobile/bottom-sheet.css',
  '/s27/css/features/mobile/full-layouts.css',
  '/s27/css/features/mobile/index.css',
  '/s27/css/features/mobile/nav.css',
  '/s27/css/features/mobile/responsive.css',
  '/s27/css/features/mobile/today-view.css',
  '/s27/css/features/mobile/weekly-view.css',
  '/s27/css/features/overlays/backdrop.css',
  '/s27/css/features/overlays/index.css',
  '/s27/css/features/overlays/info.css',
  '/s27/css/features/overlays/release-notes.css',
  '/s27/css/features/overlays/time.css',
  '/s27/css/features/settings/advanced.css',
  '/s27/css/features/settings/controls.css',
  '/s27/css/features/settings/dev-mode.css',
  '/s27/css/features/settings/index.css',
  '/s27/css/features/settings/input-demos.css',
  '/s27/css/features/settings/library-preferences.css',
  '/s27/css/features/settings/overlay-shell.css',
  '/s27/css/features/settings/presets.css',
  '/s27/css/features/settings/responsive.css',
  '/s27/css/features/settings/theme-gallery.css',
  '/s27/css/features/timetable/index.css',
  '/s27/css/features/timetable/responsive.css',
  '/s27/css/features/timetable/states.css',
  '/s27/css/features/timetable/table.css',
  '/s27/css/features/todo/index.css',
  '/s27/css/features/todo/overlay.css',
  '/s27/css/features/todo/responsive.css',
  '/s27/css/features/weather/index.css',
  '/s27/css/features/weather/menu-button.css',
  '/s27/css/features/weather/overlay.css',
  '/s27/css/features/weather/responsive.css',
  '/s27/css/layout/desktop-nav.css',
  '/s27/css/layout/index.css',
  '/s27/css/layout/shell.css',

  // Data
  '/s27/data/8a.json',
  '/s27/data/themes.json',
  '/s27/data/manuals.json',
];

// ── Install: pre-cache all static assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately, don't wait for old SW to die
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual adds so one failure doesn't block the rest
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn(`[SW] Failed to cache: ${url}`, err))
        )
      );
    })
  );
});

// ── Activate: delete stale caches from old SW versions ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim()) // Take control of all open pages immediately
  );
});

// ── Fetch: serve from cache, fall back to network ─────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests (e.g. fonts, CDN)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Data files: network-first so timetable is always fresh when online
  if (url.pathname.startsWith('/s27/data/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)) // Offline fallback
    );
    return;
  }

  // Everything else: cache-first (JS, CSS, HTML, icons)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      // Not in cache yet — fetch, store, return
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
