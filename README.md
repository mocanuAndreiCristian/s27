# S27 Timetable App

Static school timetable app for classes `8a` to `8e`.

## Public URLs

- Landing page: `https://mocanuandreicristian.github.io/s27/`
- Class pages:
  - `/8a`
  - `/8b`
  - `/8c`
  - `/8d`
  - `/8e`

These class URLs are preserved.

## Project Structure

- [`index.html`](./index.html): landing page
- [`8a`](./8a), [`8b`](./8b), [`8c`](./8c), [`8d`](./8d), [`8e`](./8e): public class entry points
- [`css`](./css): shared styles
- [`js`](./js): active app scripts
- [`data`](./data): class schedules, themes, manuals
- [`other-projects`](./other-projects): side project catalog
- [`scripts`](./scripts): maintenance and generation scripts
- [`templates`](./templates): shared source templates
- [`archive`](./archive): archived non-active code

## Main JS Areas

- [`js/app.js`](./js/app.js): app bootstrap
- [`js/core`](./js/core): config, events, shared data cache, storage helpers
- [`js/timetable`](./js/timetable): timetable loading, rendering, interactions
- [`js/settings`](./js/settings): customization, presets, theme behavior
- [`js/mobile`](./js/mobile): mobile navigation and layouts
- [`js/manuals`](./js/manuals): manuals library and recommendations
- [`js/library`](./js/library): library overlay UI
- [`js/weather`](./js/weather): weather and clock features
- [`js/overlays`](./js/overlays): overlay manager
- [`js/todo`](./js/todo): in-progress modular to-do work

## Class Page Source

- Public outputs stay in [`8a`](./8a) through [`8e`](./8e).
- The shared editable source is [`templates/class-page.template.html`](./templates/class-page.template.html).
- The generator lives in [`scripts/schedule_sync.py`](./scripts/schedule_sync.py).

Rebuild the class pages with:

```powershell
@'
from pathlib import Path
from scripts.schedule_sync import build_class_html

for class_id in ["8a", "8b", "8c", "8d", "8e"]:
    print(build_class_html(class_id, Path("templates/class-page.template.html")))
'@ | python -
```

## Current Notes

- The app is mid-modularization.
- Schedule/manual/theme data now flows through the shared cache in [`js/core/app-data.js`](./js/core/app-data.js).
- The old pre-modular JS copies were moved into [`archive/js-legacy`](./archive/js-legacy).
- The working roadmap is in [`MODULARIZATION-PLAN.md`](./MODULARIZATION-PLAN.md).

## Priority Direction

1. Move rough side features into the main app experience.
2. Keep splitting large controllers, especially customization.
3. Continue reducing remaining compatibility globals.
4. Finish the real to-do feature after structural cleanup.
