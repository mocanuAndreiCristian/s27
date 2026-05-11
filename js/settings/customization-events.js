import { emitAppEvent, onAppEvent } from "../core/events.js";
import { overlayManager } from "../overlays/overlay-manager.js";

export function setupCustomizationEventListeners({
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
    savePreset,
    exportCurrentPreset,
    handlePresetImport,
    reloadUISettingsFromStorage,
}) {
    const notifyLibrarySettingsChanged = () => {
        emitAppEvent("library-settings:updated");
    };

    const customBtn = document.getElementById("customizationBtn");
    const sheetBtn = document.getElementById("sheetCustomizationBtn");
    const closeBtn = document.getElementById("closeCustomization");
    const openFn = () => {
        overlayManager.close("sideMenu");
        overlayManager.open("customizationOverlay");
    };

    customBtn?.addEventListener("click", openFn);
    sheetBtn?.addEventListener("click", openFn);
    closeBtn?.addEventListener("click", () => {
        overlayManager.close("customizationOverlay");
    });

    overlayManager.register("customizationOverlay");

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

    onAppEvent("manuals:updated", () => {
        reloadUISettingsFromStorage();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
        notifyLibrarySettingsChanged();
    });

    onAppEvent("library-settings:updated", () => {
        reloadUISettingsFromStorage();
        syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);
    });

    document.getElementById("savePresetBtn")?.addEventListener("click", savePreset);
    document.getElementById("exportPresetBtn")?.addEventListener("click", exportCurrentPreset);
    document.getElementById("importPresetBtn")?.addEventListener("click", () => {
        document.getElementById("importPresetFile")?.click();
    });
    document.getElementById("importPresetFile")?.addEventListener("change", handlePresetImport);

    syncCustomizationInputs(state, normalizeLibrarySubjectKey);
}
