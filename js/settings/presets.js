import { normalizeHexColor } from "../core/color.js";
import {
    DEFAULT_A11Y_SETTINGS,
    DEFAULT_UI_SETTINGS,
} from "./customization-settings.js";
import { normalizePresetRecord } from "./settings-store.js";
import { getThemeDefinition, resolveActiveThemeId } from "./theme-engine.js";

function hexToHSL(hex) {
    let r = 0;
    let g = 0;
    let b = 0;

    if (hex.length === 4) {
        r = Number(`0x${hex[1]}${hex[1]}`);
        g = Number(`0x${hex[2]}${hex[2]}`);
        b = Number(`0x${hex[3]}${hex[3]}`);
    } else if (hex.length === 7) {
        r = Number(`0x${hex[1]}${hex[2]}`);
        g = Number(`0x${hex[3]}${hex[4]}`);
        b = Number(`0x${hex[5]}${hex[6]}`);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;
    let h = 0;
    let s = 0;
    let l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = ((b - r) / delta) + 2;
    else h = ((r - g) / delta) + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs((2 * l) - 1));
    s = Number((s * 100).toFixed(1));
    l = Number((l * 100).toFixed(1));

    return { h, s, l };
}

function hslToHex(h, s, l) {
    const saturation = s / 100;
    const lightness = l / 100;
    const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const match = lightness - (chroma / 2);
    let r = 0;
    let g = 0;
    let b = 0;

    if (0 <= h && h < 60) {
        r = chroma;
        g = x;
    } else if (60 <= h && h < 120) {
        r = x;
        g = chroma;
    } else if (120 <= h && h < 180) {
        g = chroma;
        b = x;
    } else if (180 <= h && h < 240) {
        g = x;
        b = chroma;
    } else if (240 <= h && h < 300) {
        r = x;
        b = chroma;
    } else if (300 <= h && h < 360) {
        r = chroma;
        b = x;
    }

    const channels = [r, g, b].map((channel) => {
        const value = Math.round((channel + match) * 255).toString(16);
        return value.length === 1 ? `0${value}` : value;
    });

    return `#${channels.join("")}`;
}

function getLuminance(hex) {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

export function generateDynamicColors(bgHex) {
    if (!bgHex) return ["#ff0000", "#00ff00", "#0000ff"];

    const hsl = hexToHSL(bgHex);
    const lum = getLuminance(bgHex);
    const isDark = lum < 128;
    const baseH = hsl.s < 10 ? 210 : hsl.h;

    const compH = (baseH + 180) % 360;
    const nicheH = (baseH + 150) % 360;
    const contrastH = (baseH + 90) % 360;

    return [
        hslToHex(compH, 85, isDark ? 60 : 45),
        hslToHex(nicheH, 80, isDark ? 65 : 40),
        hslToHex(contrastH, 90, isDark ? 80 : 30),
    ];
}

function createColorItem({ color, currentAccentColor, onSelect }) {
    const item = document.createElement("div");
    item.className = "preset-item";
    item.style.background = color;
    item.dataset.color = normalizeHexColor(color);
    if (item.dataset.color === currentAccentColor) item.classList.add("active");
    item.addEventListener("click", () => onSelect?.(color));
    return item;
}

export function renderRecommendedColors({ state, onSelect }) {
    const grid = document.getElementById("recommendedColorsGrid");
    if (!grid) return;

    const activeThemeId = resolveActiveThemeId(state.currentTheme);
    const themeDef = getThemeDefinition(state.themeDefinitions, activeThemeId);
    if (!themeDef) return;

    const curated = themeDef.recommendedColors || [];
    const bgColor = themeDef.colors["--bg-color"] || "#ffffff";
    const dynamic = generateDynamicColors(bgColor);
    const allRecommendations = [...new Set([...curated, ...dynamic])];

    grid.innerHTML = "";
    allRecommendations.forEach((color) => {
        grid.appendChild(createColorItem({
            color,
            currentAccentColor: state.currentAccentColor,
            onSelect,
        }));
    });
}

export function getCurrentPreset(state) {
    return {
        name: "Custom Preset",
        theme: state.currentTheme,
        accentColor: state.currentAccentColor,
        font: state.currentFont,
        ui: { ...state.uiSettings },
        a11y: { ...state.a11ySettings },
        timestamp: Date.now(),
    };
}

export function promptAndSaveCurrentPreset({ state, onPersist, onRender }) {
    const name = prompt("Enter a name for this preset:");
    if (!name || !name.trim()) return false;

    state.savedPresets.push(normalizePresetRecord({
        ...getCurrentPreset(state),
        name: name.trim(),
    }));

    onRender?.();
    onPersist?.(state.savedPresets);
    return true;
}

export function applyPresetToState({ state, preset }) {
    const normalizedPreset = normalizePresetRecord(preset);

    state.currentTheme = normalizedPreset.theme;
    state.currentAccentColor = normalizedPreset.accentColor;
    state.currentFont = normalizedPreset.font;
    state.uiSettings = { ...DEFAULT_UI_SETTINGS, ...normalizedPreset.ui };
    state.a11ySettings = { ...DEFAULT_A11Y_SETTINGS, ...normalizedPreset.a11y };

    return normalizedPreset;
}

export function downloadPreset(preset, fileName = "orar-preset.json") {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(preset, null, 2))}`;
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function readPresetFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                resolve(JSON.parse(String(event.target?.result || "")));
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(reader.error || new Error("Unable to read preset file."));
        };

        reader.readAsText(file);
    });
}

export function renderGallery({ onApplyPreset }) {
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;

    const galleryItems = [
        { name: "Oceanic Depth", author: "DevTeam", theme: "ocean", accent: "#00aaff", font: "'Outfit', sans-serif" },
        { name: "Neon Cyber", author: "GlitchUser", theme: "cyberpunk", accent: "#00f0ff", font: "'Space Grotesk', sans-serif" },
        { name: "Forest Hike", author: "NatureLvr", theme: "forest", accent: "#4ade80", font: "'DM Sans', sans-serif" },
        { name: "Royal Purple", author: "QueenBee", theme: "deep-purple", accent: "#ab47bc", font: "'Playfair Display', serif" },
        { name: "Minimalist", author: "CleanDesk", theme: "light", accent: "#333333", font: "'Inter', sans-serif" },
        { name: "Night Owl", author: "Coder123", theme: "midnight", accent: "#f59e0b", font: "'JetBrains Mono', monospace" },
    ];

    grid.innerHTML = galleryItems.map((item) => `
        <div class="gallery-item" data-theme="${item.theme}" data-accent="${item.accent}" data-font="${item.font}">
            <div class="gallery-preview" style="--p-bg: var(--bg-color); --p-card: var(--card-bg); --p-accent: ${item.accent}">
                <div class="gallery-preview-circle">Aa</div>
            </div>
            <div class="gallery-info">
                <div class="gallery-name">${item.name}</div>
                <div class="gallery-desc">by ${item.author}</div>
            </div>
        </div>
    `).join("");

    grid.querySelectorAll(".gallery-item").forEach((element, index) => {
        element.addEventListener("click", () => {
            const item = galleryItems[index];
            onApplyPreset?.({
                theme: item.theme,
                accentColor: item.accent,
                font: item.font,
                ui: DEFAULT_UI_SETTINGS,
                a11y: DEFAULT_A11Y_SETTINGS,
            });
        });
    });
}

export function renderColorPresets({ state, onSelect, onDelete, onPersist }) {
    const grid = document.getElementById("colorPresetsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    state.colorPresets.forEach((color) => {
        const item = createColorItem({
            color,
            currentAccentColor: state.currentAccentColor,
            onSelect,
        });
        const del = document.createElement("button");
        del.className = "preset-delete";
        del.innerHTML = "<i class='fa-solid fa-trash'></i>";
        del.addEventListener("click", (event) => {
            event.stopPropagation();
            onDelete?.(color);
        });
        item.appendChild(del);
        grid.appendChild(item);
    });

    onPersist?.(state.colorPresets);
}

export function addColorPreset(state, color) {
    const normalized = normalizeHexColor(color);
    if (!normalized || state.colorPresets.includes(normalized)) return false;

    state.colorPresets.push(normalized);
    return true;
}

export function deleteColorPreset(state, color) {
    if (state.colorPresets.length <= 1) return false;

    const nextColors = state.colorPresets.filter((entry) => entry !== color);
    if (nextColors.length === state.colorPresets.length) return false;

    state.colorPresets = nextColors;
    return true;
}

export function renderSavedPresets({ state, onApplyPreset, onDeletePreset }) {
    const grid = document.getElementById("savedPresetsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    state.savedPresets.forEach((preset, index) => {
        const card = document.createElement("div");
        card.className = "preset-card";
        card.innerHTML = `
            <div class="preset-card-header">
                <div class="preset-card-name">${preset.name}</div>
                <div class="preset-card-actions">
                    <button class="preset-card-btn delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="preset-card-details">
                <div class="preset-detail"><span class="preset-color-dot" style="background:${preset.accentColor}"></span><span>${preset.theme}</span></div>
                <div class="preset-detail"><i class="fa-solid fa-font"></i><span>${preset.font.split(",")[0]}</span></div>
            </div>
        `;

        card.addEventListener("click", (event) => {
            if (event.target.closest(".delete")) return;
            onApplyPreset?.(preset);
        });

        card.querySelector(".delete")?.addEventListener("click", () => {
            onDeletePreset?.(index);
        });

        grid.appendChild(card);
    });
}
