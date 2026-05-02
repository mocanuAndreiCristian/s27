import { normalizeHexColor } from "../core/color.js";
import { loadThemes } from "../core/data-service.js";
import { readJson, readStorage, removeStorage, writeJson, writeStorage } from "../core/storage.js";
import {
    DEFAULT_A11Y_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS,
    DEFAULT_COLOR_PRESETS,
    DEFAULT_UI_SETTINGS,
    STORAGE_KEYS,
    sanitizeAdvancedSettings,
    sanitizeUISettings,
} from "./customization-settings.js";

export const DEFAULT_FONT_FAMILY = "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
const DEFAULT_ACCENT_COLOR = "#6196ff";

function normalizeColorPresets(value) {
    if (!Array.isArray(value)) return [...DEFAULT_COLOR_PRESETS];

    const seen = new Set();
    const colors = [];

    value.forEach((entry) => {
        const normalized = normalizeHexColor(entry);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        colors.push(normalized);
    });

    return colors.length ? colors : [...DEFAULT_COLOR_PRESETS];
}

function sanitizeA11ySettings(settings = {}) {
    const textScale = Number(settings.textScale);

    return {
        ...DEFAULT_A11Y_SETTINGS,
        ...settings,
        textScale: Number.isFinite(textScale)
            ? Math.max(0.8, Math.min(1.5, textScale))
            : DEFAULT_A11Y_SETTINGS.textScale,
    };
}

function normalizeCustomFonts(value) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const fonts = [];

    value.forEach((entry) => {
        const fontName = String(entry || "").trim();
        if (!fontName || seen.has(fontName)) return;
        seen.add(fontName);
        fonts.push(fontName);
    });

    return fonts;
}

export function normalizePresetRecord(preset = {}) {
    const timestamp = Number(preset.timestamp);

    return {
        name: String(preset.name || "Custom Preset").trim() || "Custom Preset",
        theme: String(preset.theme || "auto").trim() || "auto",
        accentColor: normalizeHexColor(preset.accentColor) || DEFAULT_ACCENT_COLOR,
        font: String(preset.font || DEFAULT_FONT_FAMILY).trim() || DEFAULT_FONT_FAMILY,
        ui: sanitizeUISettings({ ...DEFAULT_UI_SETTINGS, ...(preset.ui || {}) }),
        a11y: sanitizeA11ySettings(preset.a11y || {}),
        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    };
}

function normalizeSavedPresets(value) {
    if (!Array.isArray(value)) return [];
    return value.map((preset) => normalizePresetRecord(preset));
}

export async function loadCustomizationThemeData() {
    return loadThemes();
}

export function readUiSettings() {
    return sanitizeUISettings({
        ...DEFAULT_UI_SETTINGS,
        ...(readJson(STORAGE_KEYS.UI_SETTINGS, {}) || {}),
    });
}

export function readA11ySettings() {
    return sanitizeA11ySettings(readJson(STORAGE_KEYS.A11Y_SETTINGS, {}));
}

export function readAdvancedSettings() {
    return sanitizeAdvancedSettings({
        ...DEFAULT_ADVANCED_SETTINGS,
        ...(readJson(STORAGE_KEYS.ADVANCED_SETTINGS, {}) || {}),
    });
}

export function readColorPresets() {
    return normalizeColorPresets(readJson(STORAGE_KEYS.COLOR_PRESETS, DEFAULT_COLOR_PRESETS));
}

export function readSavedPresets() {
    return normalizeSavedPresets(readJson(STORAGE_KEYS.SAVED_PRESETS, []));
}

export function readThemeSnapshot() {
    const snapshot = readJson(STORAGE_KEYS.THEME_SNAPSHOT, null);
    return snapshot && typeof snapshot === "object" ? snapshot : null;
}

export function readCustomFonts() {
    return normalizeCustomFonts(readJson(STORAGE_KEYS.CUSTOM_FONTS, []));
}

export function loadCustomizationState() {
    return {
        currentTheme: readStorage(STORAGE_KEYS.THEME, "auto") || "auto",
        currentAccentColor: normalizeHexColor(
            readStorage(STORAGE_KEYS.ACCENT_COLOR, DEFAULT_ACCENT_COLOR),
        ) || DEFAULT_ACCENT_COLOR,
        currentFont: readStorage(STORAGE_KEYS.FONT, DEFAULT_FONT_FAMILY) || DEFAULT_FONT_FAMILY,
        colorPresets: readColorPresets(),
        savedPresets: readSavedPresets(),
        uiSettings: readUiSettings(),
        a11ySettings: readA11ySettings(),
        advancedSettings: readAdvancedSettings(),
    };
}

export function ensureDefaultSavedPresets(defaultPresets = []) {
    if (readStorage(STORAGE_KEYS.SAVED_PRESETS, null) !== null) {
        return readSavedPresets();
    }

    const nextPresets = Array.isArray(defaultPresets)
        ? defaultPresets.map((preset) => normalizePresetRecord({
            ...preset,
            ui: DEFAULT_UI_SETTINGS,
            a11y: DEFAULT_A11Y_SETTINGS,
            timestamp: Date.now(),
        }))
        : [];

    saveSavedPresets(nextPresets);
    return nextPresets;
}

export function saveThemeChoice(themeId) {
    return writeStorage(STORAGE_KEYS.THEME, themeId);
}

export function saveAccentColor(color) {
    return writeStorage(STORAGE_KEYS.ACCENT_COLOR, color);
}

export function saveFontChoice(font) {
    return writeStorage(STORAGE_KEYS.FONT, font);
}

export function saveThemeSnapshot(snapshot) {
    return writeJson(STORAGE_KEYS.THEME_SNAPSHOT, snapshot);
}

export function saveColorPresets(colorPresets) {
    return writeJson(STORAGE_KEYS.COLOR_PRESETS, normalizeColorPresets(colorPresets));
}

export function saveSavedPresets(savedPresets) {
    return writeJson(
        STORAGE_KEYS.SAVED_PRESETS,
        Array.isArray(savedPresets) ? savedPresets.map((preset) => normalizePresetRecord(preset)) : [],
    );
}

export function saveUiSettings(uiSettings) {
    return writeJson(STORAGE_KEYS.UI_SETTINGS, sanitizeUISettings(uiSettings));
}

export function saveA11ySettings(a11ySettings) {
    return writeJson(STORAGE_KEYS.A11Y_SETTINGS, sanitizeA11ySettings(a11ySettings));
}

export function saveAdvancedSettings(advancedSettings) {
    return writeJson(
        STORAGE_KEYS.ADVANCED_SETTINGS,
        sanitizeAdvancedSettings(advancedSettings),
    );
}

export function saveCustomFonts(fonts) {
    return writeJson(STORAGE_KEYS.CUSTOM_FONTS, normalizeCustomFonts(fonts));
}

export function clearCustomizationStorage() {
    Object.values(STORAGE_KEYS).forEach((key) => {
        removeStorage(key);
    });
}
