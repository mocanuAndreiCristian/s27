import "./core/legacy-globals.js";

export { OverlayManager, overlayManager } from "./overlays/overlay-manager.js";
export { initCustomization } from "./settings/customization-controller.js";

import { initCustomization } from "./settings/customization-controller.js";

initCustomization();

import { onReady } from "./core/dom.js";
import {
  getBehaviorLabel,
  RECOMMENDATION_REFRESH_MS,
} from "./manuals/manuals-model.js";
import {
  addCustomManual,
  findBestManualForSubject,
  getConfiguredManualsForSubject,
  getLibrarySettings,
  getManualSetForSubject,
  getManualsCatalog,
  loadCustomManualsFromStorage,
  loadManualsData,
  notifyLibrarySettingsChanged,
  refreshCatalog,
  removeCustomManual,
} from "./manuals/manuals-store.js";
import {
  openManualEntries,
  openManualEntry,
} from "./manuals/manual-actions.js";
import {
  initRecommendedManuals,
  openManualForSubject,
  updateRecommendedManual,
} from "./manuals/recommended-manuals.js";

function installManualGlobals() {
  window.getManualsCatalog = getManualsCatalog;
  window.findBestManualForSubject = findBestManualForSubject;
  window.getConfiguredManualsForSubject = getConfiguredManualsForSubject;
  window.getManualSetForSubject = getManualSetForSubject;
  window.updateRecommendedManual = updateRecommendedManual;
  window.openManualForSubject = openManualForSubject;
  window.openManualEntry = openManualEntry;
  window.openManualEntries = openManualEntries;
  window.addCustomManual = addCustomManual;
  window.removeCustomManual = removeCustomManual;
  window.getLibrarySettings = getLibrarySettings;
  window.notifyLibrarySettingsChanged = notifyLibrarySettingsChanged;
  window.getLibraryOpenBehaviorLabel = getBehaviorLabel;
}

function initManuals() {
  initRecommendedManuals({ refreshMs: RECOMMENDATION_REFRESH_MS });
  loadCustomManualsFromStorage();
  refreshCatalog();
  void loadManualsData();
}

installManualGlobals();
onReady(initManuals);

export {
  getManualUrlForSubject,
  getTimetableData,
  highlightCurrent,
  initTimetable,
  installTimetableGlobals,
  loadTimetableData,
} from "./timetable/timetable-controller.js";

import { initTimetable } from "./timetable/timetable-controller.js";

initTimetable();

import { openLibraryOverlay } from "./library/library-controller.js";

window.openLibraryOverlay = openLibraryOverlay;

import "./ui/touch-guard.js";
import "./ui/scrollbars.js";
import "./overlays/info-overlay.js";
import "./ui/release-notes.js";
import "./todo/todo-controller.js";

import { initClock } from "./weather/clock-controller.js";
import { initWeather, getWeather } from "./weather/weather-controller.js";

initClock(window.overlayManager);

initWeather(window.overlayManager);

window.getWeather = getWeather;

import {
  init,
  showToday,
  showFull,
  openSheet,
  closeSheet,
  upShortcuts,
  renderFull,
  fillToday,
} from "./mobile/mobile-nav-controller.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init();
  });
} else {
  init();
}

window.mobileNav = {
  showTodayView: showToday,
  showFullView: showFull,
  openBottomSheet: openSheet,
  closeBottomSheet: closeSheet,
  updateShortcutButtons: upShortcuts,
  renderFullLayout: renderFull,
  fillToday,
};
window.fillToday = fillToday;
