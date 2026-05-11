# Modularization Plan

## Goals

- Clean up the structure without breaking the current public URLs.
- Keep the existing class entry points: `/8a`, `/8b`, `/8c`, `/8d`, `/8e`.
- Finish modularization before doing the real to-do feature pass.
- Improve the rough parts first, not the low-priority pages.

## Constraints We Are Keeping

- The five class URLs must stay exactly as they are now.
- The landing page is low priority.
- The half-English / half-Romanian tone stays for now unless it becomes a real UX problem.
- The to-do system gets its real work pass after the structural cleanup.

## Quick Clarification

### What "global wiring" means

Right now, many modules still talk to each other through `window.*`.

Examples:

- `window.overlayManager`
- `window.timetableData`
- `window.openManualForSubject`
- `window.mobileNav`

This works, but it makes the app feel loosely stitched together instead of cleanly connected.

### What "duplicated data loading" means

Different features fetch the same JSON separately instead of sharing one source of truth.

Examples:

- timetable loads class data
- mobile loads class data again
- recommended manuals may load class data again

That creates extra coupling and makes bugs harder to reason about.

## Phase Plan

### Phase 1: Replace `other-projects` with a proper app overlay

Goal:
Turn `other-projects` from a side page into an in-app overlay/modal like the rest of the app.

Tasks:

- Build a new `other-projects` overlay in the main app shell.
- Reuse `other-projects/projects.json` as the data source.
- Reuse only the useful parts of the current UI: search, subject filters, project cards.
- Hook it into the existing overlay system and mobile bottom sheet.
- Remove the dependency on missing CSS files from `other-projects/index.html`.
- Decide what to do with the old standalone page:
  - keep it as a fallback page, or
  - simplify it heavily, or
  - redirect users into the main app experience if that still makes sense

Definition of done:

- Projects can be opened from inside the app.
- No broken shared CSS references.
- The feature feels like part of the same product, not a random side site.

### Phase 2: Split `customization-controller.js`

Goal:
Break the current customization controller into smaller focused pieces.

Tasks:

- Extract a dedicated customization state module.
- Extract DOM refs / element lookup into a separate module.
- Extract event binding into smaller feature-specific setup modules.
- Separate concerns more clearly:
  - theme selection
  - accent color controls
  - font controls
  - UI settings
  - accessibility settings
  - library preference controls
  - preset import/export
- Keep `dev-mode.js` separate and avoid letting it bleed back into the main controller.

Definition of done:

- `customization-controller.js` becomes an orchestrator, not a giant everything-file.
- New contributors can understand where to edit a specific setting without scrolling through hundreds of lines.

### Phase 3: Keep the five URLs, but stop maintaining five giant HTML copies

Goal:
Preserve `/8a` to `/8e` exactly as public URLs, while reducing duplicated page structure.

Important:
This phase does **not** mean changing URLs.

Preferred direction:

- Keep `8a/index.html` through `8e/index.html`.
- Turn them into thin wrappers around a shared page shell.
- Keep only class-specific config in each page, such as:
  - class id
  - page title
  - maybe a few labels if needed

Possible implementation options:

1. Shared template source + generated class pages.
2. Shared shell fragment assembled by script.
3. Extremely thin per-class HTML files that all load one shared app shell.

My preferred option:

- One shared source of page markup.
- A small script generates the five output pages.
- Public URLs stay unchanged.

Definition of done:

- Public links still work exactly the same.
- Shared markup is edited in one place.
- Adding or changing a common overlay no longer means editing five huge files.

### Phase 4: Create a shared app data layer

Goal:
Stop features from fetching the same data independently.

Tasks:

- Create a central app data module/store for:
  - app config
  - timetable data
  - manuals data
  - maybe themes data if useful
- Add caching so the same data is not re-fetched by each feature.
- Make mobile, timetable, and manuals read from the shared layer instead of each doing their own fetch logic.
- Keep temporary compatibility where needed during migration.

Definition of done:

- One place loads schedule/manual data.
- Other features consume it instead of refetching.
- Data flow is easier to trace.

### Phase 5: Reduce `window.*` dependencies

Goal:
Make modules communicate through imports, explicit APIs, or shared events instead of hidden globals.

Tasks:

- List current `window.*` dependencies.
- Classify them:
  - must keep temporarily
  - easy to replace now
  - needs adapter during migration
- Replace direct global calls with imported helpers or feature APIs where possible.
- Keep a tiny compatibility layer only for the pieces that still need it.

Definition of done:

- Most feature modules no longer rely on random globals.
- `app.js` becomes a real bootstrap entry instead of a global export hub.

### Phase 6: Clean repo leftovers after the migration

Goal:
Reduce confusion while working.

Tasks:

- Decide what to do with `js-backup-before-remote-copy-20260511-205002/`.
- Decide what to do with `js/legacy js/`.
- Remove or archive old files once the new modular versions are confirmed stable.
- Add a real README that explains:
  - structure
  - entry points
  - data files
  - how class pages are generated if we go that route

Definition of done:

- Searching the repo shows the current code first, not old copies.
- The project is easier to onboard into.

### Phase 7: Real to-do feature pass

Goal:
Work on to-do after the structure is clean enough to support it properly.

Tasks:

- Decide whether to finish the existing modular to-do system or rework it.
- Replace the under-construction placeholder UI.
- Hook the real UI into overlays, storage, notifications, and mobile interactions.
- Make sure the feature feels consistent with the rest of the app.

Definition of done:

- To-do is a real finished feature, not a placeholder plus half-connected modules.

## Recommended Working Order

1. `other-projects` overlay
2. `customization-controller.js` split
3. shared class page shell while preserving URLs
4. shared data layer
5. `window.*` cleanup
6. repo cleanup and documentation
7. real to-do work

## Not a Priority Right Now

- landing page redesign
- full language consistency pass
- broad visual redesign

## Risks To Watch

- Breaking class-page behavior while trying to reduce duplicate HTML
- Replacing globals too aggressively before a shared data/app layer exists
- Leaving both old and new versions alive too long and creating confusion

## Success Criteria

- URLs stay stable.
- Shared features are edited in one place.
- Data loading is centralized.
- The app has fewer hidden dependencies.
- The next feature work, especially to-do, becomes much easier to build cleanly.
