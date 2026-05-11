export const STORAGE_KEYS = Object.freeze({
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
    CUSTOM_MANUALS: "custom-library-manuals-v1",
    TODO_TASKS: "adv-todo-tasks",
    TODO_FOLDERS: "adv-todo-folders",
    TODO_NOTIFIED: "adv-todo-notified",
    TODO_SETTINGS: "adv-todo-settings",
});

export function readStorage(key, fallback = "") {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (error) {
        console.warn(`Unable to read localStorage key "${key}"`, error);
        return fallback;
    }
}

export function writeStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Unable to write localStorage key "${key}"`, error);
        return false;
    }
}

export function removeStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Unable to remove localStorage key "${key}"`, error);
        return false;
    }
}

export function readJson(key, fallback) {
    const raw = readStorage(key, null);
    if (raw === null) return fallback;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`Unable to parse localStorage JSON key "${key}"`, error);
        return fallback;
    }
}

export function writeJson(key, value) {
    return writeStorage(key, JSON.stringify(value));
}

