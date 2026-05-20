import "./core/legacy-globals.js";

import { onReady } from "./core/dom.js";
import { overlayManager } from "./overlays/overlay-manager.js";
import { initCustomization } from "./settings/customization-controller.js";
import { RECOMMENDATION_REFRESH_MS } from "./manuals/manuals-model.js";
import {
    loadCustomManualsFromStorage,
    loadManualsData,
    refreshCatalog,
} from "./manuals/manuals-store.js";
import { initRecommendedManuals } from "./manuals/recommended-manuals.js";
import { initTimetable } from "./timetable/timetable-controller.js";
import "./ui/touch-guard.js";
import "./ui/scrollbars.js";
import "./overlays/info-overlay.js";
import "./ui/release-notes.js";
import "./todo/todo-controller.js";
import { initClock } from "./weather/clock-controller.js";
import { initWeather } from "./weather/weather-controller.js";
import { init as initMobile } from "./mobile/mobile-nav-controller.js";
import { openLibraryOverlay } from "./library/library-controller.js";
export { OverlayManager, overlayManager } from "./overlays/overlay-manager.js";
export { initCustomization } from "./settings/customization-controller.js";
export {
    getManualUrlForSubject,
    getTimetableData,
    highlightCurrent,
    loadTimetableData,
} from "./timetable/timetable-controller.js";

function initManuals() {
    initRecommendedManuals({ refreshMs: RECOMMENDATION_REFRESH_MS });
    loadCustomManualsFromStorage();
    refreshCatalog();
    void loadManualsData();
}

initCustomization();
initTimetable();
initClock(overlayManager);
initWeather(overlayManager);
onReady(initManuals);
onReady(() => openLibraryOverlay());

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initMobile();
    });
} else {
    initMobile();
}
