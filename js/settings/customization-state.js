import {
    DEFAULT_A11Y_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS,
    DEFAULT_COLOR_PRESETS,
    DEFAULT_UI_SETTINGS,
} from "./customization-settings.js";
import { DEFAULT_FONT_FAMILY } from "./settings-store.js";

export function createCustomizationState() {
    return {
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
}
