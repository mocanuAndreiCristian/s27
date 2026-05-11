import {
    getAccessibleTextColor,
    getRelativeLuminance,
    hexToRgb,
    normalizeHexColor,
} from "../core/color.js";

export function resolveActiveThemeId(themeId = "auto") {
    if (themeId === "auto") {
        const prefersDark = window.matchMedia
            && window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "dark" : "light";
    }

    return themeId || "light";
}

export function uniqueThemeTags(tags = [], scheme = "dark") {
    const unique = new Set();

    if (scheme === "light" || scheme === "dark") {
        unique.add(scheme);
    }

    (tags || []).forEach((tag) => {
        const normalized = String(tag || "").trim().toLowerCase();
        if (normalized) unique.add(normalized);
    });

    return Array.from(unique);
}

export function getThemeScheme(themeDefinitions, themeOrId) {
    const theme = typeof themeOrId === "string"
        ? themeDefinitions.find((item) => item.id === themeOrId)
        : themeOrId;

    if (!theme) return "dark";
    if (theme.id === "auto") return "dynamic";
    if (["light", "dark", "dynamic"].includes(theme.scheme)) return theme.scheme;
    if ((theme.tags || []).includes("dynamic")) return "dynamic";
    return (theme.tags || []).includes("light") ? "light" : "dark";
}

export function hexToRgba(color, alpha) {
    const rgb = hexToRgb(color);
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    if (!rgb) return "transparent";
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
}

export function mixHexColors(primary, secondary, weight = 0.5) {
    const left = hexToRgb(primary);
    const right = hexToRgb(secondary);
    const ratio = Math.max(0, Math.min(1, Number(weight) || 0));

    if (!left && !right) return "";
    if (!left) return normalizeHexColor(secondary);
    if (!right) return normalizeHexColor(primary);

    const r = Math.round((left.r * (1 - ratio)) + (right.r * ratio));
    const g = Math.round((left.g * (1 - ratio)) + (right.g * ratio));
    const b = Math.round((left.b * (1 - ratio)) + (right.b * ratio));

    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function getContrastRatio(firstColor, secondColor) {
    const first = getRelativeLuminance(firstColor);
    const second = getRelativeLuminance(secondColor);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
}

export function clampThemeSurface(
    color,
    scheme,
    { maxLuminance = 0.16, mixStrength = 0.18 } = {},
) {
    const normalized = normalizeHexColor(color);
    if (!normalized || scheme !== "dark") return normalized;

    const luminance = getRelativeLuminance(normalized);
    if (luminance <= maxLuminance) return normalized;

    const blend = Math.min(0.72, mixStrength + ((luminance - maxLuminance) * 2.4));
    return mixHexColors(normalized, "#000000", blend);
}

export function generateThemeAtmosphere(colors = {}, scheme = "dark") {
    if (scheme === "dynamic") return "none";

    const baseColor = normalizeHexColor(colors["--bg-color"]) || (scheme === "dark" ? "#121212" : "#f8fafc");
    const glowPrimary = normalizeHexColor(colors["--highlight-color"])
        || normalizeHexColor(colors["--surface-alt"])
        || normalizeHexColor(colors["--surface-color"])
        || baseColor;
    const glowSecondary = normalizeHexColor(colors["--border-color"])
        || normalizeHexColor(colors["--surface-color"])
        || glowPrimary;
    const glowTertiary = mixHexColors(glowPrimary, glowSecondary, 0.5) || glowPrimary;

    const first = mixHexColors(
        glowPrimary,
        scheme === "dark" ? "#ffffff" : baseColor,
        scheme === "dark" ? 0.08 : 0.18,
    ) || glowPrimary;
    const second = mixHexColors(
        glowSecondary,
        scheme === "dark" ? "#000000" : "#ffffff",
        scheme === "dark" ? 0.12 : 0.08,
    ) || glowSecondary;

    return [
        `radial-gradient(circle at 14% 18%, ${hexToRgba(first, scheme === "dark" ? 0.26 : 0.18)} 0%, transparent 42%)`,
        `radial-gradient(circle at 82% 16%, ${hexToRgba(second, scheme === "dark" ? 0.18 : 0.12)} 0%, transparent 38%)`,
        `radial-gradient(circle at 54% 84%, ${hexToRgba(glowTertiary, scheme === "dark" ? 0.16 : 0.1)} 0%, transparent 44%)`,
    ].join(", ");
}

export function normalizeThemeDefinition(theme = {}) {
    const scheme = theme.id === "auto"
        ? "dynamic"
        : ((theme.tags || []).includes("light") ? "light" : "dark");
    const colors = { ...(theme.colors || {}) };

    if (scheme === "dark") {
        colors["--bg-color"] = clampThemeSurface(colors["--bg-color"] || "#121212", scheme, { maxLuminance: 0.08, mixStrength: 0.28 }) || "#121212";
        colors["--surface-color"] = clampThemeSurface(colors["--surface-color"] || "#1e1e1e", scheme, { maxLuminance: 0.12, mixStrength: 0.24 }) || "#1e1e1e";
        colors["--surface-alt"] = clampThemeSurface(colors["--surface-alt"] || colors["--surface-color"], scheme, { maxLuminance: 0.15, mixStrength: 0.2 }) || colors["--surface-color"];
        colors["--card-bg"] = clampThemeSurface(colors["--card-bg"] || colors["--surface-color"], scheme, { maxLuminance: 0.12, mixStrength: 0.22 }) || colors["--surface-color"];
        colors["--input-bg"] = clampThemeSurface(colors["--input-bg"] || colors["--bg-color"], scheme, { maxLuminance: 0.09, mixStrength: 0.2 }) || colors["--bg-color"];
        colors["--highlight-color"] = clampThemeSurface(colors["--highlight-color"] || colors["--surface-alt"], scheme, { maxLuminance: 0.18, mixStrength: 0.16 }) || colors["--surface-alt"];
        colors["--text-color"] = "#ffffff";
        colors["--text-muted"] = "rgba(255, 255, 255, 0.72)";
        colors["--shadow-color"] = "rgba(0, 0, 0, 0.36)";
        colors["--shadow-color-strong"] = "rgba(0, 0, 0, 0.52)";
        colors["--shadow-color-modal"] = "rgba(0, 0, 0, 0.72)";
    } else if (scheme === "light") {
        colors["--text-color"] = "#000000";
        colors["--text-muted"] = "rgba(0, 0, 0, 0.64)";
        colors["--shadow-color"] = "rgba(15, 23, 42, 0.10)";
        colors["--shadow-color-strong"] = "rgba(15, 23, 42, 0.18)";
        colors["--shadow-color-modal"] = "rgba(15, 23, 42, 0.42)";
    }

    if (scheme !== "dynamic") {
        colors["--theme-background-image"] = generateThemeAtmosphere(colors, scheme);
    }

    return {
        ...theme,
        scheme,
        tags: uniqueThemeTags(theme.tags, scheme),
        colors,
        recommendedColors: [...new Set((theme.recommendedColors || []).map(normalizeHexColor).filter(Boolean))],
    };
}

export function getThemeDefinition(themeDefinitions, themeId = resolveActiveThemeId()) {
    return themeDefinitions.find((theme) => theme.id === themeId) || null;
}

export function syncAccentInputs(color) {
    const colorPicker = document.getElementById("customColorPicker");
    const hexInput = document.getElementById("colorHexInput");

    if (colorPicker) colorPicker.value = color;
    if (hexInput) hexInput.value = color.toUpperCase();
}

export function runVisualThemeTransaction(state, callback) {
    const root = document.documentElement;
    const body = document.body;

    root.classList.add("theme-switching");
    if (body) body.classList.add("theme-switching");

    callback();

    if (state.themeSwitchCleanupFrame) {
        cancelAnimationFrame(state.themeSwitchCleanupFrame);
    }

    state.themeSwitchCleanupFrame = requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
        if (body) body.classList.remove("theme-switching");
        state.themeSwitchCleanupFrame = 0;
    });
}

function persistThemeSnapshot(saveThemeSnapshot, activeThemeId, themeDef, themeDefinitions) {
    if (!themeDef?.colors || typeof saveThemeSnapshot !== "function") return;

    saveThemeSnapshot({
        activeThemeId,
        scheme: getThemeScheme(themeDefinitions, themeDef),
        colors: themeDef.colors,
        updatedAt: Date.now(),
    });
}

export function applyTheme({
    state,
    themeId,
    persist = true,
    queueSideEffects = true,
    fullSync = true,
    saveThemeChoice,
    saveThemeSnapshot,
    queueCustomizationSync,
}) {
    state.currentTheme = themeId;
    const activeThemeId = resolveActiveThemeId(themeId);
    const themeDef = getThemeDefinition(state.themeDefinitions, activeThemeId);
    const root = document.documentElement;

    runVisualThemeTransaction(state, () => {
        document.body?.setAttribute("data-theme", activeThemeId);
        root.setAttribute("data-theme", activeThemeId);
        root.style.colorScheme = getThemeScheme(state.themeDefinitions, themeDef) === "light"
            ? "light"
            : "dark";

        if (themeDef?.colors) {
            Object.entries(themeDef.colors).forEach(([variable, value]) => {
                root.style.setProperty(variable, value);
            });
        }

        if (state.uiSettings.bgImage) {
            document.body.style.backgroundImage = `url('${state.uiSettings.bgImage}')`;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
        } else if (themeDef && !themeDef.colors["--bg-image"]) {
            document.body.style.backgroundImage = "";
        }
    });

    if (persist && typeof saveThemeChoice === "function") {
        saveThemeChoice(state.currentTheme);
    }

    persistThemeSnapshot(
        saveThemeSnapshot,
        activeThemeId,
        themeDef,
        state.themeDefinitions,
    );

    if (queueSideEffects && typeof queueCustomizationSync === "function") {
        queueCustomizationSync({
            themeChanged: true,
            refreshRecommendedColors: true,
            fullSync,
        });
    }

    return themeDef;
}

export function applyAccentColor({
    state,
    color,
    persist = true,
    queueSideEffects = true,
    fullSync = true,
    syncInputs = true,
    saveAccentColor,
    queueCustomizationSync,
}) {
    const normalizedColor = normalizeHexColor(color);
    if (!normalizedColor) return false;

    const accentTextColor = getAccessibleTextColor(normalizedColor);
    state.currentAccentColor = normalizedColor;

    runVisualThemeTransaction(state, () => {
        document.documentElement.style.setProperty("--accent-color", normalizedColor);
        document.documentElement.style.setProperty("--text-on-accent", accentTextColor);
        if (syncInputs) {
            syncAccentInputs(normalizedColor);
        }
    });

    if (persist && typeof saveAccentColor === "function") {
        saveAccentColor(normalizedColor);
    }

    if (queueSideEffects && typeof queueCustomizationSync === "function") {
        queueCustomizationSync({
            accentChanged: true,
            fullSync,
        });
    }

    return true;
}

export function applyFont({ state, font, saveFontChoice, loadGoogleFont }) {
    state.currentFont = font;
    document.documentElement.style.setProperty("--font-family", font);
    if (typeof saveFontChoice === "function") {
        saveFontChoice(font);
    }

    const preview = document.getElementById("fontPreview");
    if (preview) preview.style.fontFamily = font;
    if (typeof loadGoogleFont === "function") {
        loadGoogleFont(font);
    }
}

export function updateButtonTextColors(color) {
    document.documentElement.style.setProperty(
        "--text-on-accent",
        getAccessibleTextColor(color),
    );
}

export function updateFavicon(color) {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, 2 * Math.PI);
    ctx.fill();

    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon";
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
}

export function updateMetaThemeColor(color) {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", color);
}
