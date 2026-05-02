export const STORAGE_KEYS = {
    THEME: "customization-theme",
    ACCENT_COLOR: "customization-accent-color",
    FONT: "customization-font",
    THEME_SNAPSHOT: "customization-theme-snapshot",
    COLOR_PRESETS: "customization-color-presets",
    SAVED_PRESETS: "customization-saved-presets",
    UI_SETTINGS: "customization-ui-settings",
    A11Y_SETTINGS: "customization-a11y-settings",
    CUSTOM_FONTS: "custom-fonts",
    ADVANCED_SETTINGS: "advancedSettings",
};

export const DEFAULT_COLOR_PRESETS = ["#6196ff", "#ff6b6b", "#f59e0b", "#51d88a", "#a855f7"];

export const DEFAULT_UI_SETTINGS = {
    borderRadius: 16,
    glassIntensity: 80,
    compactMode: false,
    minimalCells: false,
    bgImage: "",
    mobileNavScroll: false,
    hideEmptyDays: false,
    bgPattern: false,
    libraryPreferredOpenType: "link",
    libraryDesktopColumns: 4,
    libraryRecommendedOpenBehavior: "open-all",
    libraryRecommendedManualMap: {},
    libraryRecommendedMode: "link",
    libraryRecommendedCustomTypes: {},
    markColor: "#6196ff",
    markOpacity: 80,
    highlightColor: "#6196ff",
    highlightOpacity: 30,
};

export const DEFAULT_A11Y_SETTINGS = {
    highContrast: false,
    reducedMotion: false,
    focusIndicators: false,
    grayscale: false,
    textScale: 1,
};

export const DEFAULT_ADVANCED_SETTINGS = {
    interactionMode: "link",
    shortcut1: "customization",
    shortcut2: "weather",
};

const VALID_SHORTCUT_OPTIONS = new Set([
    "customization",
    "weather",
    "clock",
    "tasks",
    "info",
    "library",
]);

function sanitizeShortcutValue(value, fallback) {
    return VALID_SHORTCUT_OPTIONS.has(value) ? value : fallback;
}

export function normalizeLibrarySubjectKey(value = "") {
    const stripped = String(value).replace(/<[^>]*>/g, " ");
    const lettersOnly = stripped.replace(/[^\p{L}\p{N}\s]/gu, " ");
    const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeLibraryOpenType(value, fallback = DEFAULT_UI_SETTINGS.libraryPreferredOpenType) {
    return ["link", "pdf", "app"].includes(value) ? value : fallback;
}

export function normalizeLibraryRecommendedMode(value, fallback = DEFAULT_UI_SETTINGS.libraryRecommendedMode) {
    return ["link", "pdf", "app", "custom"].includes(value) ? value : fallback;
}

export function normalizeLibraryOpenBehavior(value, fallback = DEFAULT_UI_SETTINGS.libraryRecommendedOpenBehavior) {
    return ["open-all", "buttons", "both"].includes(value) ? value : fallback;
}

export function sanitizeLibraryManualList(value) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const result = [];

    value.forEach((manualId) => {
        const normalized = String(manualId || "").trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        result.push(normalized);
    });

    return result.slice(0, 3);
}

export function sanitizeLibraryCustomTypeMap(value) {
    if (!value || typeof value !== "object") return {};

    return Object.fromEntries(
        Object.entries(value)
            .map(([key, type]) => [normalizeLibrarySubjectKey(key), normalizeLibraryOpenType(type, "link")])
            .filter(([key]) => Boolean(key)),
    );
}

export function sanitizeLibraryManualMap(value) {
    if (!value || typeof value !== "object") return {};

    return Object.fromEntries(
        Object.entries(value)
            .map(([key, manualIds]) => [normalizeLibrarySubjectKey(key), sanitizeLibraryManualList(manualIds)])
            .filter(([key, manualIds]) => Boolean(key) && manualIds.length > 0),
    );
}

export function sanitizeUISettings(settings = {}) {
    return {
        ...settings,
        libraryPreferredOpenType: normalizeLibraryOpenType(
            settings.libraryPreferredOpenType,
            DEFAULT_UI_SETTINGS.libraryPreferredOpenType,
        ),
        libraryDesktopColumns: Math.max(
            2,
            Math.min(
                6,
                Number.isFinite(Number(settings.libraryDesktopColumns))
                    ? Math.round(Number(settings.libraryDesktopColumns))
                    : DEFAULT_UI_SETTINGS.libraryDesktopColumns,
            ),
        ),
        libraryRecommendedMode: normalizeLibraryRecommendedMode(
            settings.libraryRecommendedMode,
            DEFAULT_UI_SETTINGS.libraryRecommendedMode,
        ),
        libraryRecommendedOpenBehavior: normalizeLibraryOpenBehavior(
            settings.libraryRecommendedOpenBehavior,
            DEFAULT_UI_SETTINGS.libraryRecommendedOpenBehavior,
        ),
        libraryRecommendedManualMap: sanitizeLibraryManualMap(
            settings.libraryRecommendedManualMap,
        ),
        libraryRecommendedCustomTypes: sanitizeLibraryCustomTypeMap(
            settings.libraryRecommendedCustomTypes,
        ),
    };
}

export function sanitizeAdvancedSettings(settings = {}) {
    return {
        ...settings,
        shortcut1: sanitizeShortcutValue(settings.shortcut1, DEFAULT_ADVANCED_SETTINGS.shortcut1),
        shortcut2: sanitizeShortcutValue(settings.shortcut2, DEFAULT_ADVANCED_SETTINGS.shortcut2),
    };
}

