import { getAppConfig } from "../core/config.js";
import {
    DEFAULT_A11Y_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS,
    DEFAULT_COLOR_PRESETS,
    DEFAULT_UI_SETTINGS,
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
    DEFAULT_FONT_FAMILY,
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

const state = {
    currentTheme: "auto",
    currentAccentColor: "#6196ff",
    currentFont: DEFAULT_FONT_FAMILY,
    colorPresets: [...DEFAULT_COLOR_PRESETS],
    savedPresets: [],
    themeDefinitions: [],
    currentThemeSearchTerm: "",
    activeThemeTag: "all",
    uiSettings: { ...DEFAULT_UI_SETTINGS },
    a11ySettings: { ...DEFAULT_A11Y_SETTINGS },
    advancedSettings: { ...DEFAULT_ADVANCED_SETTINGS },
    googleFontsLink: null,
    themeSwitchCleanupFrame: 0,
    deferredCustomizationFrame: 0,
    pendingCustomizationWork: {
        themeChanged: false,
        accentChanged: false,
        refreshRecommendedColors: false,
        fullSync: false,
    },
};

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

        window.applyAutoTintedText?.();
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

function notifyLibrarySettingsChanged() {
    window.dispatchEvent(new CustomEvent("library-settings:updated"));
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
    window.applyAutoTintedText?.();
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
    window.dispatchEvent(new CustomEvent("mobile-nav:shortcuts-updated"));

    if (
        (newSettings.shortcut1 || newSettings.shortcut2)
        && window.mobileNav
        && window.mobileNav.updateShortcutButtons
    ) {
        window.mobileNav.updateShortcutButtons();
    }
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

function setupEventListeners() {
    const customBtn = document.getElementById("customizationBtn");
    const sheetBtn = document.getElementById("sheetCustomizationBtn");
    const closeBtn = document.getElementById("closeCustomization");
    const openFn = () => {
        if (!window.overlayManager) return;
        window.overlayManager.close("sideMenu");
        window.overlayManager.open("customizationOverlay");
    };

    customBtn?.addEventListener("click", openFn);
    sheetBtn?.addEventListener("click", openFn);
    closeBtn?.addEventListener("click", () => {
        window.overlayManager?.close("customizationOverlay");
    });

    window.overlayManager?.register("customizationOverlay");

    document.querySelectorAll(".sidebar-item").forEach((item) => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-item").forEach((element) => {
                element.classList.remove("active");
            });
            item.classList.add("active");
            document.querySelectorAll(".custom-section").forEach((section) => {
                section.classList.remove("active");
            });
            const section = document.getElementById(`${item.dataset.section}Section`);
            if (section) section.classList.add("active");
        });
    });

    const searchInput = document.getElementById("themeSearch");
    const tagsContainer = document.getElementById("themeTags");

    if (searchInput) {
        searchInput.value = state.currentThemeSearchTerm;
        searchInput.addEventListener("input", (event) => {
            state.currentThemeSearchTerm = event.target.value;
            renderThemeChooser();
        });
    }

    tagsContainer?.addEventListener("click", (event) => {
        const button = event.target.closest(".theme-tag");
        if (!button) return;

        state.activeThemeTag = button.dataset.tag || "all";
        renderThemeChooser();
    });

    const colorSchemeQuery = window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const syncAutoTheme = () => {
        if (state.currentTheme !== "auto") return;
        handleThemeSelection("auto", { persist: false });
        renderThemeChooser();
    };

    if (colorSchemeQuery) {
        if (typeof colorSchemeQuery.addEventListener === "function") {
            colorSchemeQuery.addEventListener("change", syncAutoTheme);
        } else if (typeof colorSchemeQuery.addListener === "function") {
            colorSchemeQuery.addListener(syncAutoTheme);
        }
    }

    document.getElementById("customColorPicker")?.addEventListener("input", (event) => {
        handleAccentColorSelection(event.target.value, {
            persist: false,
            fullSync: false,
        });
    });
    document.getElementById("customColorPicker")?.addEventListener("change", (event) => {
        handleAccentColorSelection(event.target.value);
    });
    document.getElementById("colorHexInput")?.addEventListener("change", (event) => {
        let value = event.target.value;
        if (!value.startsWith("#")) value = `#${value}`;
        if (/^#[0-9A-F]{6}$/i.test(value)) {
            handleAccentColorSelection(value);
        }
    });
    document.getElementById("randomColorBtn")?.addEventListener("click", () => {
        handleAccentColorSelection(
            `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
        );
    });
    document.getElementById("addColorPreset")?.addEventListener("click", () => {
        if (!addColorPreset(state, state.currentAccentColor)) return;
        renderColorPresetGrid();
    });

    document.getElementById("fontSelect")?.addEventListener("change", (event) => {
        handleFontSelection(event.target.value);
    });

    document.getElementById("uiBorderRadius")?.addEventListener("input", (event) => {
        state.uiSettings.borderRadius = parseInt(event.target.value, 10);
        applyUISettings();
    });
    document.getElementById("uiGlassIntensity")?.addEventListener("input", (event) => {
        state.uiSettings.glassIntensity = parseInt(event.target.value, 10);
        applyUISettings();
    });
    document.getElementById("uiCompactMode")?.addEventListener("change", (event) => {
        state.uiSettings.compactMode = event.target.checked;
        applyUISettings();
    });
    document.getElementById("uiMinimalCells")?.addEventListener("change", (event) => {
        state.uiSettings.minimalCells = event.target.checked;
        applyUISettings();
    });
    document.getElementById("uiBgImage")?.addEventListener("change", (event) => {
        state.uiSettings.bgImage = event.target.value;
        applyUISettings();
    });
    document.getElementById("uiBgClear")?.addEventListener("click", () => {
        state.uiSettings.bgImage = "";
        const bgInput = document.getElementById("uiBgImage");
        if (bgInput) bgInput.value = "";
        applyUISettings();
    });
    document.getElementById("uiMobileNavScroll")?.addEventListener("change", (event) => {
        state.uiSettings.mobileNavScroll = event.target.checked;
        applyUISettings();
    });
    document.getElementById("uiHideEmptyDays")?.addEventListener("change", (event) => {
        state.uiSettings.hideEmptyDays = event.target.checked;
        applyUISettings();
    });
    document.getElementById("uiBgPattern")?.addEventListener("change", (event) => {
        state.uiSettings.bgPattern = event.target.checked;
        applyUISettings();
    });
    document.getElementById("uiMarkColor")?.addEventListener("input", (event) => {
        state.uiSettings.markColor = event.target.value;
        applyUISettings();
    });
    document.getElementById("uiMarkColor")?.addEventListener("change", (event) => {
        state.uiSettings.markColor = event.target.value;
        applyUISettings();
    });
    document.getElementById("uiMarkOpacity")?.addEventListener("input", (event) => {
        state.uiSettings.markOpacity = parseInt(event.target.value, 10);
        applyUISettings();
    });
    document.getElementById("uiHighlightColor")?.addEventListener("input", (event) => {
        state.uiSettings.highlightColor = event.target.value;
        applyUISettings();
    });
    document.getElementById("uiHighlightColor")?.addEventListener("change", (event) => {
        state.uiSettings.highlightColor = event.target.value;
        applyUISettings();
    });
    document.getElementById("uiHighlightOpacity")?.addEventListener("input", (event) => {
        state.uiSettings.highlightOpacity = parseInt(event.target.value, 10);
        applyUISettings();
    });
    document.getElementById("uiLibraryPreferredOpenType")?.addEventListener("change", (event) => {
        state.uiSettings.libraryPreferredOpenType = normalizeLibraryOpenType(event.target.value);
        applyUISettings();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
        notifyLibrarySettingsChanged();
    });
    document.getElementById("uiLibraryDesktopColumns")?.addEventListener("input", (event) => {
        state.uiSettings.libraryDesktopColumns = Math.max(
            2,
            Math.min(6, parseInt(event.target.value, 10) || 4),
        );
        applyUISettings();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
        notifyLibrarySettingsChanged();
    });
    document.querySelectorAll("[data-library-open-behavior]").forEach((button) => {
        button.addEventListener("click", () => {
            state.uiSettings.libraryRecommendedOpenBehavior = normalizeLibraryOpenBehavior(
                button.dataset.libraryOpenBehavior,
            );
            applyUISettings();
            syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
            notifyLibrarySettingsChanged();
        });
    });
    document.getElementById("uiLibraryCustomPrefsGrid")?.addEventListener("change", (event) => {
        const select = event.target.closest("[data-library-subject-pref]");
        if (!select) return;

        const row = select.closest("[data-library-subject-row]");
        if (!row) return;

        const values = Array.from(row.querySelectorAll("[data-library-subject-pref]"))
            .map((input) => input.value);
        const sanitizedValues = sanitizeLibraryManualList(values);
        const nextMap = {
            ...state.uiSettings.libraryRecommendedManualMap,
        };

        if (sanitizedValues.length) {
            nextMap[select.dataset.librarySubjectPref] = sanitizedValues;
        } else {
            delete nextMap[select.dataset.librarySubjectPref];
        }

        state.uiSettings.libraryRecommendedManualMap = nextMap;
        applyUISettings();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
        notifyLibrarySettingsChanged();
    });

    document.getElementById("a11yHighContrast")?.addEventListener("change", (event) => {
        state.a11ySettings.highContrast = event.target.checked;
        applyA11ySettings();
    });
    document.getElementById("a11yReducedMotion")?.addEventListener("change", (event) => {
        state.a11ySettings.reducedMotion = event.target.checked;
        applyA11ySettings();
    });
    document.getElementById("a11yFocusIndicators")?.addEventListener("change", (event) => {
        state.a11ySettings.focusIndicators = event.target.checked;
        applyA11ySettings();
    });
    document.getElementById("a11yGrayscale")?.addEventListener("change", (event) => {
        state.a11ySettings.grayscale = event.target.checked;
        applyA11ySettings();
    });
    document.getElementById("a11yTextScale")?.addEventListener("input", (event) => {
        state.a11ySettings.textScale = parseFloat(event.target.value);
        applyA11ySettings();
    });

    document.getElementById("modeLinkBtn")?.addEventListener("click", () => {
        applyAdvancedSettings({ interactionMode: "link" });
    });
    document.getElementById("modeMarkBtn")?.addEventListener("click", () => {
        applyAdvancedSettings({ interactionMode: "mark" });
    });
    document.getElementById("shortcut1Select")?.addEventListener("change", (event) => {
        applyAdvancedSettings({ shortcut1: event.target.value });
    });
    document.getElementById("shortcut2Select")?.addEventListener("change", (event) => {
        applyAdvancedSettings({ shortcut2: event.target.value });
    });

    document.querySelectorAll(".preset-tab-btn").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".preset-tab-btn").forEach((element) => {
                element.classList.remove("active");
            });
            button.classList.add("active");
            document.querySelectorAll(".presets-content-wrapper").forEach((element) => {
                element.classList.remove("active");
            });
            document.getElementById(`${button.dataset.tab}Content`)?.classList.add("active");
        });
    });

    document.querySelectorAll(".ui-tab-btn").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".ui-tab-btn").forEach((element) => {
                element.classList.remove("active");
            });
            button.classList.add("active");
            document.querySelectorAll(".ui-content-wrapper").forEach((element) => {
                element.classList.remove("active");
            });
            document.getElementById(`${button.dataset.tab}Content`)?.classList.add("active");
        });
    });

    window.addEventListener("manuals:updated", () => {
        reloadUISettingsFromStorage();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
        notifyLibrarySettingsChanged();
    });

    window.addEventListener("library-settings:updated", () => {
        reloadUISettingsFromStorage();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
    });

    document.getElementById("savePresetBtn")?.addEventListener("click", () => {
        promptAndSaveCurrentPreset({
            state,
            onPersist: saveSavedPresets,
            onRender: renderSavedPresetCards,
        });
    });
    document.getElementById("exportPresetBtn")?.addEventListener("click", exportCurrentPreset);
    document.getElementById("importPresetBtn")?.addEventListener("click", () => {
        document.getElementById("importPresetFile")?.click();
    });
    document.getElementById("importPresetFile")?.addEventListener("change", handlePresetImport);
}

function setupGoogleFonts() {
    if (state.googleFontsLink) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;600;700&family=Ubuntu:wght@400;500;700&family=Nunito:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Fira+Code:wght@400;600&display=swap";
    document.head.appendChild(link);
    state.googleFontsLink = link;
}

function loadGoogleFont(fontFamily) {
    void fontFamily;
}

function loadSavedCustomFonts() {
    const select = document.getElementById("fontSelect");
    if (!select) return;

    readCustomFonts().forEach((fontName) => {
        const option = document.createElement("option");
        option.value = `'${fontName}', sans-serif`;
        option.textContent = `${fontName} (Custom)`;
        select.appendChild(option);
    });
}

function addCustomGoogleFont() {
    const name = prompt("Font Name (Google Fonts):");
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${trimmedName.replace(/ /g, "+")}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const fonts = readCustomFonts();
    if (fonts.includes(trimmedName)) return;

    fonts.push(trimmedName);
    saveCustomFonts(fonts);

    const select = document.getElementById("fontSelect");
    if (!select) return;

    const option = document.createElement("option");
    option.value = `'${trimmedName}', sans-serif`;
    option.textContent = `${trimmedName} (Custom)`;
    select.appendChild(option);
    select.value = option.value;
    handleFontSelection(option.value);
}

function initializeBaseControls() {
    const numberInputField = document.querySelector(".number-input-field");
    const numberBtns = document.querySelectorAll(".number-btn");
    if (numberInputField && numberBtns.length === 2) {
        numberBtns[0].addEventListener("click", () => {
            const current = parseInt(numberInputField.value, 10) || 0;
            const min = parseInt(numberInputField.min, 10) || 0;
            if (current > min) {
                numberInputField.value = String(current - 1);
            }
        });

        numberBtns[1].addEventListener("click", () => {
            const current = parseInt(numberInputField.value, 10) || 0;
            const max = parseInt(numberInputField.max, 10) || 100;
            if (current < max) {
                numberInputField.value = String(current + 1);
            }
        });
    }

    const rangeSlider = document.querySelector(".range-slider-demo");
    const rangeValue = document.querySelector("#rangeValue");
    if (rangeSlider && rangeValue) {
        const updateRangeValue = () => {
            rangeValue.textContent = rangeSlider.value;
        };
        rangeSlider.addEventListener("input", updateRangeValue);
    }

    const colorPicker = document.getElementById("demoColorPicker");
    const colorValue = document.getElementById("demoColorValue");
    if (colorPicker && colorValue) {
        const updateColorValue = () => {
            colorValue.textContent = colorPicker.value.toUpperCase();
        };
        colorPicker.addEventListener("input", updateColorValue);
        colorPicker.addEventListener("change", updateColorValue);
    }
}

function getColorBrightness(color) {
    if (!color || color === "transparent") return 128;

    let hex = color;
    if (color.startsWith("rgb")) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            const [r, g, b] = match.slice(0, 3).map((value) => parseInt(value, 10));
            hex = `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
        }
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
}

function applyAutoTintedText() {
    const selectors = [
        ".setting-group",
        ".dev-time-control",
        ".dev-weather-control",
        ".dev-quick-actions",
        ".dev-info-panel",
        ".ui-control-card",
        ".font-group",
        ".ui-controls-grid",
        ".preset-action-btn",
        ".mode-toggle-container",
    ];

    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
            const bgColor = window.getComputedStyle(element).backgroundColor;
            const brightness = getColorBrightness(bgColor);
            const textColor = brightness > 150 ? "#000000" : "#ffffff";

            element.querySelectorAll("h4, h3, h2, p, label, span, button").forEach((textEl) => {
                if (textEl.textContent && textEl.tagName !== "BUTTON") {
                    textEl.style.color = textColor;
                }
            });
        });
    });
}

async function startCustomization() {
    setupGoogleFonts();
    await loadThemesFromJSON();
    loadSettings();
    applySettings();
    setupEventListeners();
    renderColorPresetGrid();
    renderRecommendedAccentColors();
    renderSavedPresetCards();
    renderThemeChooser();
    renderPresetGallery();
    loadSavedCustomFonts();
    checkColorContrast(state);
    initializeBaseControls();
    syncCustomizationInputs(state, normalizeLibrarySubjectKey);

    window.addCustomGoogleFont = addCustomGoogleFont;
    document.getElementById("addCustomFont")?.addEventListener("click", addCustomGoogleFont);

    window.applyAutoTintedText = applyAutoTintedText;
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
