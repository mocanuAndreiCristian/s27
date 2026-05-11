import { getAppConfig } from "../core/config.js";
import { emitAppEvent } from "../core/events.js";
import {
    normalizeLibraryOpenBehavior,
    normalizeLibraryOpenType,
    normalizeLibrarySubjectKey,
    sanitizeAdvancedSettings,
    sanitizeLibraryManualList,
    sanitizeUISettings,
} from "./customization-settings.js";
import { initDevMode } from "./dev-mode.js";
import {
    addColorPreset,
    applyPresetToState,
    deleteColorPreset,
    downloadPreset,
    getCurrentPreset,
    promptAndSaveCurrentPreset,
    readPresetFile,
    renderColorPresets,
    renderGallery,
    renderRecommendedColors,
    renderSavedPresets,
} from "./presets.js";
import {
    clearCustomizationStorage,
    ensureDefaultSavedPresets,
    loadCustomizationState,
    loadCustomizationThemeData,
    readCustomFonts,
    readUiSettings,
    saveAccentColor,
    saveAdvancedSettings,
    saveA11ySettings,
    saveColorPresets,
    saveCustomFonts,
    saveFontChoice,
    saveSavedPresets,
    saveThemeChoice,
    saveThemeSnapshot,
    saveUiSettings,
} from "./settings-store.js";
import {
    applyAccentColor,
    applyFont,
    applyTheme,
    normalizeThemeDefinition,
    updateButtonTextColors,
    updateFavicon,
    updateMetaThemeColor,
} from "./theme-engine.js";
import {
    checkColorContrast,
    renderThemeCards,
    syncCustomizationInputs,
    syncLibrarySettingsInputs,
    updateUISelections,
} from "./customization-view.js";
import { createCustomizationState } from "./customization-state.js";
import { applyAutoTintedText, initializeBaseControls } from "./customization-base-controls.js";
import {
    addCustomGoogleFont,
    loadGoogleFont,
    loadSavedCustomFonts,
    setupGoogleFonts,
} from "./customization-fonts.js";
import { setupCustomizationEventListeners } from "./customization-events.js";

const state = createCustomizationState();

let initializationPromise = null;

function handleThemeSelection(themeId, options = {}) {
    return applyTheme({
        state,
        themeId,
        ...options,
        saveThemeChoice,
        saveThemeSnapshot,
        queueCustomizationSync,
    });
}

function handleAccentColorSelection(color, options = {}) {
    return applyAccentColor({
        state,
        color,
        ...options,
        saveAccentColor,
        queueCustomizationSync,
    });
}

function handleFontSelection(font) {
    applyFont({
        state,
        font,
        saveFontChoice,
        loadGoogleFont,
    });
}

function renderColorPresetGrid() {
    renderColorPresets({
        state,
        onSelect: (color) => {
            handleAccentColorSelection(color);
        },
        onDelete: (color) => {
            if (!deleteColorPreset(state, color)) return;
            renderColorPresetGrid();
        },
        onPersist: saveColorPresets,
    });
}

function renderRecommendedAccentColors() {
    renderRecommendedColors({
        state,
        onSelect: (color) => {
            handleAccentColorSelection(color);
        },
    });
}

function renderSavedPresetCards() {
    renderSavedPresets({
        state,
        onApplyPreset: (preset) => {
            applyPreset(preset);
        },
        onDeletePreset: (index) => {
            state.savedPresets.splice(index, 1);
            renderSavedPresetCards();
            saveSavedPresets(state.savedPresets);
        },
    });
}

function renderPresetGallery() {
    renderGallery({
        onApplyPreset: (preset) => {
            applyPreset(preset);
        },
    });
}

function queueCustomizationSync({
    themeChanged = false,
    accentChanged = false,
    refreshRecommendedColors = false,
    fullSync = true,
} = {}) {
    state.pendingCustomizationWork.themeChanged = state.pendingCustomizationWork.themeChanged || themeChanged;
    state.pendingCustomizationWork.accentChanged = state.pendingCustomizationWork.accentChanged || accentChanged;
    state.pendingCustomizationWork.refreshRecommendedColors = state.pendingCustomizationWork.refreshRecommendedColors || refreshRecommendedColors;
    state.pendingCustomizationWork.fullSync = state.pendingCustomizationWork.fullSync || fullSync;

    if (state.deferredCustomizationFrame) return;

    state.deferredCustomizationFrame = requestAnimationFrame(() => {
        state.deferredCustomizationFrame = 0;
        const work = state.pendingCustomizationWork;
        state.pendingCustomizationWork = {
            themeChanged: false,
            accentChanged: false,
            refreshRecommendedColors: false,
            fullSync: false,
        };

        if (work.accentChanged) {
            updateButtonTextColors(state.currentAccentColor);
        }

        updateUISelections(state);

        if (!work.fullSync) return;

        updateMetaThemeColor(state.currentAccentColor);
        updateFavicon(state.currentAccentColor);
        checkColorContrast(state);

        if (work.refreshRecommendedColors) {
            renderRecommendedAccentColors();
        }

        applyAutoTintedText();
    });
}

async function loadThemesFromJSON() {
    try {
        const data = await loadCustomizationThemeData();
        state.themeDefinitions = (data.themes || []).map(normalizeThemeDefinition);
        state.savedPresets = ensureDefaultSavedPresets(data.defaultPresets);
    } catch (error) {
        console.error("Error loading themes data:", error);
    }
}

function loadSettings() {
    Object.assign(state, loadCustomizationState());
}

function reloadUISettingsFromStorage() {
    state.uiSettings = readUiSettings();
}

function applySettings() {
    handleThemeSelection(state.currentTheme, { persist: false, queueSideEffects: false });
    handleAccentColorSelection(state.currentAccentColor, {
        persist: false,
        queueSideEffects: false,
    });
    handleFontSelection(state.currentFont);
    applyUISettings();
    applyA11ySettings();
    queueCustomizationSync({
        themeChanged: true,
        accentChanged: true,
        refreshRecommendedColors: true,
        fullSync: true,
    });
}

function applyUISettings() {
    state.uiSettings = sanitizeUISettings(state.uiSettings);
    const root = document.documentElement;

    root.style.setProperty("--border-radius", `${state.uiSettings.borderRadius}px`);

    const glassVal = state.uiSettings.glassIntensity / 100;
    const blurVal = 20 * glassVal;
    root.style.setProperty("--backdrop-blur", `${blurVal}px`);
    root.style.setProperty("--library-desktop-columns", String(state.uiSettings.libraryDesktopColumns));

    document.body.classList.toggle("compact-timetable", state.uiSettings.compactMode);
    document.body.classList.toggle("minimal-cells", state.uiSettings.minimalCells);
    document.body.classList.toggle("hide-empty-days", state.uiSettings.hideEmptyDays);
    document.body.classList.toggle("bg-pattern", state.uiSettings.bgPattern);
    document.body.classList.toggle("mobile-nav-scroll", state.uiSettings.mobileNavScroll);

    if (state.uiSettings.bgImage) {
        document.body.style.backgroundImage = `url('${state.uiSettings.bgImage}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    } else {
        document.body.style.backgroundImage = "";
    }

    saveUiSettings(state.uiSettings);
    applyAutoTintedText();
}

function applyA11ySettings() {
    document.body.classList.toggle("high-contrast", state.a11ySettings.highContrast);
    document.body.classList.toggle("reduced-motion", state.a11ySettings.reducedMotion);
    document.body.classList.toggle("focus-indicators", state.a11ySettings.focusIndicators);
    document.body.classList.toggle("grayscale", state.a11ySettings.grayscale);

    document.documentElement.style.setProperty("--font-scale", state.a11ySettings.textScale);
    saveA11ySettings(state.a11ySettings);
}

function applyAdvancedSettings(newSettings) {
    state.advancedSettings = sanitizeAdvancedSettings({
        ...state.advancedSettings,
        ...newSettings,
    });
    saveAdvancedSettings(state.advancedSettings);
    syncCustomizationInputs(state, normalizeLibrarySubjectKey);
    emitAppEvent("mobile-nav:shortcuts-updated");
}

function applyPreset(preset) {
    applyPresetToState({ state, preset });
    applySettings();
    syncCustomizationInputs(state, normalizeLibrarySubjectKey);
}

function renderThemeChooser() {
    renderThemeCards({
        state,
        onApplyTheme: (themeId) => {
            handleThemeSelection(themeId);
        },
    });
}

function exportCurrentPreset() {
    const { classId } = getAppConfig();
    downloadPreset(getCurrentPreset(state), `orar-${classId}-preset.json`);
}

function handlePresetImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    readPresetFile(file)
        .then((preset) => {
            applyPreset(preset);
            event.target.value = "";
        })
        .catch(() => {
            alert("Invalid preset file.");
        });
}

function saveCurrentPreset() {
    promptAndSaveCurrentPreset({
        state,
        onPersist: saveSavedPresets,
        onRender: renderSavedPresetCards,
    });
}

function handleAddCustomFont() {
    addCustomGoogleFont({
        readCustomFonts,
        saveCustomFonts,
        onSelectFont: handleFontSelection,
    });
}

async function startCustomization() {
    setupGoogleFonts(state);
    await loadThemesFromJSON();
    loadSettings();
    applySettings();

    setupCustomizationEventListeners({
        state,
        handleThemeSelection,
        handleAccentColorSelection,
        handleFontSelection,
        applyUISettings,
        applyA11ySettings,
        applyAdvancedSettings,
        renderThemeChooser,
        renderColorPresetGrid,
        syncCustomizationInputs,
        syncLibrarySettingsInputs,
        normalizeLibraryOpenType,
        normalizeLibraryOpenBehavior,
        normalizeLibrarySubjectKey,
        sanitizeLibraryManualList,
        addColorPreset,
        savePreset: saveCurrentPreset,
        exportCurrentPreset,
        handlePresetImport,
        reloadUISettingsFromStorage,
    });

    renderColorPresetGrid();
    renderRecommendedAccentColors();
    renderSavedPresetCards();
    renderThemeChooser();
    renderPresetGallery();
    loadSavedCustomFonts(readCustomFonts);
    checkColorContrast(state);
    initializeBaseControls();
    syncCustomizationInputs(state, normalizeLibrarySubjectKey);

    document.getElementById("addCustomFont")?.addEventListener("click", handleAddCustomFont);

    requestAnimationFrame(applyAutoTintedText);

    initDevMode({ clearCustomizationStorage });
}

export function initCustomization() {
    if (initializationPromise) return initializationPromise;

    initializationPromise = new Promise((resolve, reject) => {
        const bootstrap = () => {
            startCustomization().then(resolve).catch(reject);
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
        } else {
            bootstrap();
        }
    });

    return initializationPromise;
}
