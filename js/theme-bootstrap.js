(function () {
    "use strict";

    const STORAGE_KEYS = {
        THEME: "customization-theme",
        ACCENT_COLOR: "customization-accent-color",
        FONT: "customization-font",
        THEME_SNAPSHOT: "customization-theme-snapshot",
    };

    const LIGHT_THEMES = new Set([
        "light",
        "sunset",
        "lavender",
        "cyberpunk",
        "solarized-light",
        "coffee",
        "matcha",
        "amber-glow",
        "minty-fresh",
        "bubblegum",
        "bone",
        "lemon",
        "desert-sand",
        "cherry-blossom",
        "glacier",
        "marshmallow",
        "vintage-paper",
        "ice-cream",
        "sky-high",
    ]);

    const FALLBACK_LIGHT = {
        "--text-color": "#2d2d2d",
        "--text-muted": "#666666",
        "--bg-color": "#f9f9f9",
        "--surface-color": "#ffffff",
        "--surface-alt": "#fafafa",
        "--card-bg": "#ffffff",
        "--input-bg": "#f5f5f5",
        "--highlight-color": "#f5f5f5",
        "--border-color": "#e0e0e0",
        "--divider-color": "#e5e5e5",
        "--shadow-color": "rgba(0, 0, 0, 0.1)",
        "--shadow-color-modal": "rgba(0, 0, 0, 0.5)",
        "--overlay-bg": "rgba(0, 0, 0, 0.5)",
        "--overlay-bg-strong": "rgba(0, 0, 0, 0.85)",
        "--text-on-accent": "#ffffff",
        "--text-on-danger": "#ffffff",
    };

    const FALLBACK_DARK = {
        "--text-color": "#f0f0f0",
        "--text-muted": "#a0a0a0",
        "--bg-color": "#121212",
        "--surface-color": "#1e1e1e",
        "--surface-alt": "#252525",
        "--card-bg": "#1e1e1e",
        "--input-bg": "#2c2c2c",
        "--highlight-color": "#333333",
        "--border-color": "#333333",
        "--divider-color": "#3d3d3d",
        "--shadow-color": "rgba(0, 0, 0, 0.4)",
        "--shadow-color-modal": "rgba(0, 0, 0, 0.6)",
        "--overlay-bg": "rgba(0, 0, 0, 0.7)",
        "--overlay-bg-strong": "rgba(0, 0, 0, 0.9)",
        "--text-on-accent": "#ffffff",
        "--text-on-danger": "#ffffff",
    };

    function normalizeHexColor(color) {
        if (typeof color !== "string") return "";
        let value = color.trim();
        if (!value) return "";
        if (!value.startsWith("#")) value = `#${value}`;

        if (/^#[0-9a-f]{3}$/i.test(value)) {
            value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
        }

        return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "";
    }

    function resolveActiveThemeId(themeId) {
        if (themeId === "auto") {
            return window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }

        return themeId || "light";
    }

    function getStoredSnapshot() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.THEME_SNAPSHOT);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    try {
        const root = document.documentElement;
        const themeId = localStorage.getItem(STORAGE_KEYS.THEME) || "auto";
        const activeThemeId = resolveActiveThemeId(themeId);
        const accentColor =
            normalizeHexColor(
                localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) || "#6196ff",
            ) || "#6196ff";
        const fontFamily = localStorage.getItem(STORAGE_KEYS.FONT);
        const snapshot = getStoredSnapshot();
        const fallbackColors = LIGHT_THEMES.has(activeThemeId)
            ? FALLBACK_LIGHT
            : FALLBACK_DARK;
        const resolvedColors =
            snapshot &&
            snapshot.activeThemeId === activeThemeId &&
            snapshot.colors
                ? { ...fallbackColors, ...snapshot.colors }
                : fallbackColors;
        const scheme =
            snapshot && snapshot.activeThemeId === activeThemeId
                ? snapshot.scheme || (LIGHT_THEMES.has(activeThemeId) ? "light" : "dark")
                : LIGHT_THEMES.has(activeThemeId)
                  ? "light"
                  : "dark";

        root.setAttribute("data-theme", activeThemeId);
        root.style.colorScheme = scheme;

        Object.entries(resolvedColors).forEach(([variable, value]) => {
            if (value) root.style.setProperty(variable, value);
        });

        root.style.setProperty("--accent-color", accentColor);
        if (fontFamily) root.style.setProperty("--font-family", fontFamily);

        if (resolvedColors["--bg-color"]) {
            root.style.backgroundColor = resolvedColors["--bg-color"];
        }
        if (resolvedColors["--text-color"]) {
            root.style.color = resolvedColors["--text-color"];
        }

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute("content", accentColor);
    } catch (error) {
        // Keep first-paint bootstrap failure silent and fall back to CSS defaults.
    }
})();
