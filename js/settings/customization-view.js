import { getAccessibleTextColor, normalizeHexColor } from "../core/color.js";
import { getManualsCatalog } from "../manuals/manuals-store.js";
import { getBehaviorLabel } from "../manuals/manuals-model.js";
import { sanitizeLibraryManualList } from "./customization-settings.js";
import {
    getContrastRatio,
    getThemeDefinition,
    resolveActiveThemeId,
    uniqueThemeTags,
} from "./theme-engine.js";

export function syncCustomizationInputs(state, normalizeLibrarySubjectKey) {
    const colorPicker = document.getElementById("customColorPicker");
    const hexInput = document.getElementById("colorHexInput");
    if (colorPicker) colorPicker.value = state.currentAccentColor;
    if (hexInput) hexInput.value = state.currentAccentColor.toUpperCase();

    const fontSelect = document.getElementById("fontSelect");
    if (fontSelect) fontSelect.value = state.currentFont;

    const uiBorderRadius = document.getElementById("uiBorderRadius");
    const uiGlassIntensity = document.getElementById("uiGlassIntensity");
    const uiCompactMode = document.getElementById("uiCompactMode");
    const uiMinimalCells = document.getElementById("uiMinimalCells");
    const uiBgImage = document.getElementById("uiBgImage");
    const uiMobileNavScroll = document.getElementById("uiMobileNavScroll");
    const uiHideEmptyDays = document.getElementById("uiHideEmptyDays");
    const uiBgPattern = document.getElementById("uiBgPattern");
    const uiMarkColor = document.getElementById("uiMarkColor");
    const uiMarkOpacity = document.getElementById("uiMarkOpacity");
    const uiHighlightColor = document.getElementById("uiHighlightColor");
    const uiHighlightOpacity = document.getElementById("uiHighlightOpacity");

    if (uiBorderRadius) uiBorderRadius.value = String(state.uiSettings.borderRadius);
    if (uiGlassIntensity) uiGlassIntensity.value = String(state.uiSettings.glassIntensity);
    if (uiCompactMode) uiCompactMode.checked = Boolean(state.uiSettings.compactMode);
    if (uiMinimalCells) uiMinimalCells.checked = Boolean(state.uiSettings.minimalCells);
    if (uiBgImage) uiBgImage.value = state.uiSettings.bgImage;
    if (uiMobileNavScroll) uiMobileNavScroll.checked = Boolean(state.uiSettings.mobileNavScroll);
    if (uiHideEmptyDays) uiHideEmptyDays.checked = Boolean(state.uiSettings.hideEmptyDays);
    if (uiBgPattern) uiBgPattern.checked = Boolean(state.uiSettings.bgPattern);
    if (uiMarkColor) uiMarkColor.value = state.uiSettings.markColor;
    if (uiMarkOpacity) uiMarkOpacity.value = String(state.uiSettings.markOpacity);
    if (uiHighlightColor) uiHighlightColor.value = state.uiSettings.highlightColor;
    if (uiHighlightOpacity) uiHighlightOpacity.value = String(state.uiSettings.highlightOpacity);

    syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey);

    const a11yHighContrast = document.getElementById("a11yHighContrast");
    const a11yReducedMotion = document.getElementById("a11yReducedMotion");
    const a11yFocusIndicators = document.getElementById("a11yFocusIndicators");
    const a11yGrayscale = document.getElementById("a11yGrayscale");
    const a11yTextScale = document.getElementById("a11yTextScale");

    if (a11yHighContrast) a11yHighContrast.checked = Boolean(state.a11ySettings.highContrast);
    if (a11yReducedMotion) a11yReducedMotion.checked = Boolean(state.a11ySettings.reducedMotion);
    if (a11yFocusIndicators) a11yFocusIndicators.checked = Boolean(state.a11ySettings.focusIndicators);
    if (a11yGrayscale) a11yGrayscale.checked = Boolean(state.a11ySettings.grayscale);
    if (a11yTextScale) a11yTextScale.value = String(state.a11ySettings.textScale);

    const modeLinkBtn = document.getElementById("modeLinkBtn");
    const modeMarkBtn = document.getElementById("modeMarkBtn");
    const modeText = document.getElementById("currentModeText");

    if (modeLinkBtn && modeMarkBtn) {
        modeLinkBtn.classList.toggle("active", state.advancedSettings.interactionMode === "link");
        modeMarkBtn.classList.toggle("active", state.advancedSettings.interactionMode === "mark");
    }

    if (modeText) {
        modeText.textContent = state.advancedSettings.interactionMode === "link"
            ? "Deschide manual"
            : "Marcheaza materia";
    }

    const shortcut1Select = document.getElementById("shortcut1Select");
    const shortcut2Select = document.getElementById("shortcut2Select");
    if (shortcut1Select) shortcut1Select.value = state.advancedSettings.shortcut1;
    if (shortcut2Select) shortcut2Select.value = state.advancedSettings.shortcut2;
}

export function getLibrarySubjectEntries(normalizeLibrarySubjectKey) {
    const manuals = getManualsCatalog();
    const grouped = new Map();

    manuals.forEach((manual) => {
        const key = normalizeLibrarySubjectKey(manual.subject || manual.title);
        if (!key) return;

        if (!grouped.has(key)) {
            grouped.set(key, {
                key,
                label: manual.displaySubject || manual.subject || manual.title,
                manuals: [],
            });
        }

        grouped.get(key).manuals.push({
            id: manual.id,
            title: manual.title,
            type: manual.type,
            source: manual.source,
        });
    });

    const entries = Array.from(grouped.values()).map((entry) => ({
        ...entry,
        manuals: entry.manuals.sort((left, right) => {
            if (left.source !== right.source) {
                return left.source === "custom" ? -1 : 1;
            }

            return left.title.localeCompare(right.title, "ro", { sensitivity: "base" });
        }),
    }));

    entries.sort((left, right) => left.label.localeCompare(right.label, "ro", { sensitivity: "base" }));
    return entries;
}

export function renderLibraryCustomPreferenceRows(state, normalizeLibrarySubjectKey) {
    const grid = document.getElementById("uiLibraryCustomPrefsGrid");
    if (!grid) return;

    const subjects = getLibrarySubjectEntries(normalizeLibrarySubjectKey);
    grid.innerHTML = "";

    if (!subjects.length) {
        const empty = document.createElement("p");
        empty.className = "library-pref-empty";
        empty.textContent = "Materiile vor aparea aici dupa ce se incarca manualele.";
        grid.appendChild(empty);
        return;
    }

    subjects.forEach(({ key, label, manuals }) => {
        const item = document.createElement("div");
        item.className = "library-pref-item";
        item.dataset.librarySubjectRow = key;

        const title = document.createElement("span");
        title.textContent = label;

        const slots = document.createElement("div");
        slots.className = "library-pref-slots";

        const selectedManuals = sanitizeLibraryManualList(
            state.uiSettings.libraryRecommendedManualMap?.[key],
        );

        for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
            const wrapper = document.createElement("div");
            wrapper.className = "custom-select-wrapper library-pref-slot";

            const select = document.createElement("select");
            select.className = "font-select library-pref-select";
            select.dataset.librarySubjectPref = key;
            select.dataset.librarySubjectSlot = String(slotIndex);

            const emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = `Gol ${slotIndex + 1}`;
            select.appendChild(emptyOption);

            manuals.forEach((manual) => {
                const option = document.createElement("option");
                option.value = manual.id;
                option.textContent = `${manual.title} (${manual.type.toUpperCase()}${manual.source === "custom" ? ", personalizat" : ""})`;
                select.appendChild(option);
            });

            select.value = selectedManuals[slotIndex] || "";

            const icon = document.createElement("i");
            icon.className = "fa-solid fa-chevron-down select-arrow";

            wrapper.append(select, icon);
            slots.appendChild(wrapper);

            if (slotIndex < 2) {
                const separator = document.createElement("span");
                separator.className = "library-pref-separator";
                separator.setAttribute("aria-hidden", "true");
                separator.textContent = "|";
                slots.appendChild(separator);
            }
        }

        item.append(title, slots);
        grid.appendChild(item);
    });
}

export function syncLibrarySettingsInputs(state, normalizeLibrarySubjectKey) {
    const openTypeSelect = document.getElementById("uiLibraryPreferredOpenType");
    const openTypeNote = document.getElementById("uiLibraryOpenTypeNote");
    const columnsInput = document.getElementById("uiLibraryDesktopColumns");
    const columnsValue = document.getElementById("uiLibraryDesktopColumnsValue");
    const behaviorText = document.getElementById("uiLibraryBehaviorText");
    const customPrefsWrap = document.getElementById("uiLibraryCustomPrefsWrap");
    const interactionLocked = state.advancedSettings.interactionMode !== "link";

    if (openTypeSelect) {
        openTypeSelect.value = state.uiSettings.libraryPreferredOpenType;
        openTypeSelect.disabled = interactionLocked;
        openTypeSelect.closest(".ui-control-card")?.classList.toggle("is-disabled", interactionLocked);
    }

    if (openTypeNote) {
        openTypeNote.textContent = interactionLocked
            ? "Dezactivat pentru ca modul de interactiune este Marcare materie."
            : "Folosit cand modul de interactiune este Deschide manual.";
    }

    if (columnsInput) {
        columnsInput.value = String(state.uiSettings.libraryDesktopColumns);
    }

    if (columnsValue) {
        columnsValue.textContent = `${state.uiSettings.libraryDesktopColumns} / rand`;
    }

    document.querySelectorAll("[data-library-open-behavior]").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.libraryOpenBehavior === state.uiSettings.libraryRecommendedOpenBehavior,
        );
    });

    if (behaviorText) {
        const label = getBehaviorLabel(state.uiSettings.libraryRecommendedOpenBehavior);
        behaviorText.textContent = label;
    }

    if (customPrefsWrap) {
        customPrefsWrap.hidden = false;
    }

    renderLibraryCustomPreferenceRows(state, normalizeLibrarySubjectKey);
}

function formatThemeTagLabel(tag) {
    if (tag === "all") return "All";
    if (tag === "dynamic") return "Auto";

    return String(tag || "")
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getThemeSearchText(theme) {
    return [
        theme.name,
        theme.description,
        theme.scheme,
        ...(theme.tags || []),
    ].join(" ").toLowerCase();
}

function buildThemeFilterOptions(state) {
    const counts = new Map([["all", state.themeDefinitions.length]]);

    state.themeDefinitions.forEach((theme) => {
        uniqueThemeTags(theme.tags, theme.scheme).forEach((tag) => {
            counts.set(tag, (counts.get(tag) || 0) + 1);
        });
    });

    const priority = ["all", "dynamic", "light", "dark"];
    const ordered = [];

    priority.forEach((tag) => {
        if (!counts.has(tag)) return;
        ordered.push({ tag, count: counts.get(tag) });
        counts.delete(tag);
    });

    Array.from(counts.entries())
        .sort((left, right) => {
            if (right[1] !== left[1]) return right[1] - left[1];
            return left[0].localeCompare(right[0]);
        })
        .forEach(([tag, count]) => {
            ordered.push({ tag, count });
        });

    return ordered;
}

function getCurrentThemeLabel(state) {
    const selectedTheme = state.themeDefinitions.find((theme) => theme.id === state.currentTheme);
    const activeTheme = getThemeDefinition(
        state.themeDefinitions,
        resolveActiveThemeId(state.currentTheme),
    );

    if (state.currentTheme === "auto" && activeTheme) {
        return `Auto -> ${activeTheme.name}`;
    }

    return selectedTheme?.name || activeTheme?.name || "Theme";
}

function getThemeCardDescription(state, theme) {
    if (theme.id !== "auto") return theme.description || "";

    const activeTheme = getThemeDefinition(
        state.themeDefinitions,
        resolveActiveThemeId("auto"),
    );

    return activeTheme
        ? `Follows your system. Right now it resolves to ${activeTheme.name}.`
        : (theme.description || "Follows your system.");
}

function getThemeVisibleTags(theme) {
    return uniqueThemeTags(theme.tags, theme.scheme)
        .filter((tag) => tag !== theme.scheme)
        .slice(0, 3);
}

function matchesThemeFilter(state, theme, searchTerm = state.currentThemeSearchTerm, tag = state.activeThemeTag) {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
    const matchesSearch = !normalizedSearch || getThemeSearchText(theme).includes(normalizedSearch);
    const matchesTag = tag === "all"
        || theme.scheme === tag
        || (theme.tags || []).includes(tag);

    return matchesSearch && matchesTag;
}

function filterThemes(state, searchTerm = state.currentThemeSearchTerm, tag = state.activeThemeTag) {
    state.currentThemeSearchTerm = searchTerm;
    state.activeThemeTag = tag;
    return state.themeDefinitions.filter((theme) => matchesThemeFilter(state, theme, searchTerm, tag));
}

function renderThemeFilterTags(state) {
    const tagsContainer = document.getElementById("themeTags");
    if (!tagsContainer) return;

    tagsContainer.innerHTML = "";

    buildThemeFilterOptions(state).forEach(({ tag, count }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme-tag";
        button.dataset.tag = tag;
        button.classList.toggle("active", tag === state.activeThemeTag);
        button.setAttribute("aria-pressed", tag === state.activeThemeTag ? "true" : "false");

        const label = document.createElement("span");
        label.textContent = formatThemeTagLabel(tag);

        const badge = document.createElement("span");
        badge.className = "theme-tag-count";
        badge.textContent = String(count);

        button.append(label, badge);
        tagsContainer.appendChild(button);
    });
}

function updateThemeHeader(state, filteredThemes = filterThemes(state)) {
    const countEl = document.getElementById("themeResultsCount");
    const activeEl = document.getElementById("themeActiveLabel");
    const metaEl = document.getElementById("themeResultsMeta");

    if (countEl) countEl.textContent = String(filteredThemes.length);
    if (activeEl) activeEl.textContent = getCurrentThemeLabel(state);

    if (!metaEl) return;

    const summary = [`${filteredThemes.length} of ${state.themeDefinitions.length} visible`];
    if (state.activeThemeTag !== "all") {
        summary.push(`tag: ${formatThemeTagLabel(state.activeThemeTag)}`);
    }
    if (state.currentThemeSearchTerm.trim()) {
        summary.push(`search: "${state.currentThemeSearchTerm.trim()}"`);
    }

    metaEl.textContent = summary.join(" - ");
}

function createThemeCard(state, theme, onApplyTheme) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    card.dataset.theme = theme.id;
    card.dataset.scheme = theme.scheme;
    card.classList.toggle("active", theme.id === state.currentTheme);

    const preview = document.createElement("div");
    preview.className = "theme-card-preview";
    preview.style.setProperty("--theme-preview-bg", theme.colors?.["--bg-color"] || "#121212");
    preview.style.setProperty("--theme-preview-surface", theme.colors?.["--surface-color"] || theme.colors?.["--card-bg"] || "#1e1e1e");
    preview.style.setProperty("--theme-preview-highlight", theme.colors?.["--highlight-color"] || theme.colors?.["--surface-alt"] || "#2a2a2a");
    preview.style.setProperty("--theme-preview-atmosphere", theme.colors?.["--theme-background-image"] || "none");

    const windowDots = document.createElement("div");
    windowDots.className = "theme-card-preview-window";
    windowDots.innerHTML = "<span></span><span></span><span></span>";

    const layout = document.createElement("div");
    layout.className = "theme-card-preview-layout";
    layout.innerHTML = `
        <div class="theme-card-preview-rail"></div>
        <div class="theme-card-preview-stack">
            <span></span>
            <span></span>
        </div>
    `;

    preview.append(windowDots, layout);

    const header = document.createElement("div");
    header.className = "theme-card-header";

    const icon = document.createElement("div");
    icon.className = "theme-icon";
    icon.textContent = theme.icon || " ";

    const badge = document.createElement("span");
    badge.className = "theme-card-badge";
    badge.textContent = formatThemeTagLabel(theme.scheme);

    header.append(icon, badge);

    const name = document.createElement("div");
    name.className = "theme-name";
    name.textContent = theme.name;

    const description = document.createElement("div");
    description.className = "theme-description";
    description.textContent = getThemeCardDescription(state, theme);

    const footer = document.createElement("div");
    footer.className = "theme-card-footer";

    const tags = document.createElement("div");
    tags.className = "theme-card-tags";
    getThemeVisibleTags(theme).forEach((tag) => {
        const tagPill = document.createElement("span");
        tagPill.className = "theme-card-tag";
        tagPill.textContent = formatThemeTagLabel(tag);
        tags.appendChild(tagPill);
    });

    const swatches = document.createElement("div");
    swatches.className = "theme-card-swatches";
    (theme.recommendedColors || []).slice(0, 3).forEach((color) => {
        const swatch = document.createElement("span");
        swatch.style.background = color;
        swatches.appendChild(swatch);
    });

    footer.append(tags, swatches);
    card.append(preview, header, name, description, footer);
    card.addEventListener("click", () => onApplyTheme?.(theme.id));
    return card;
}

export function renderThemeCards({ state, onApplyTheme }) {
    const container = document.getElementById("themeOptions") || document.querySelector(".theme-options");
    if (!container) return;

    const filteredThemes = filterThemes(state, state.currentThemeSearchTerm, state.activeThemeTag);
    renderThemeFilterTags(state);
    updateThemeHeader(state, filteredThemes);

    container.innerHTML = "";

    if (!filteredThemes.length) {
        const empty = document.createElement("div");
        empty.className = "theme-empty-state";
        empty.textContent = "No themes match that combination yet.";
        container.appendChild(empty);
        return;
    }

    filteredThemes.forEach((theme) => {
        container.appendChild(createThemeCard(state, theme, onApplyTheme));
    });
}

export function updateUISelections(state) {
    document.querySelectorAll(".theme-card").forEach((card) => {
        card.classList.toggle("active", card.dataset.theme === state.currentTheme);
    });

    document.querySelectorAll(".theme-tag").forEach((tagButton) => {
        const isActive = tagButton.dataset.tag === state.activeThemeTag;
        tagButton.classList.toggle("active", isActive);
        tagButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    document.querySelectorAll(".preset-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.color === state.currentAccentColor);
    });

    updateThemeHeader(
        state,
        state.themeDefinitions.filter((theme) => matchesThemeFilter(state, theme)),
    );
}

export function checkColorContrast(state) {
    const warningEl = document.getElementById("contrastWarning");
    if (!warningEl) return;

    const activeTheme = getThemeDefinition(
        state.themeDefinitions,
        resolveActiveThemeId(state.currentTheme),
    );
    const themeBackground = normalizeHexColor(activeTheme?.colors?.["--bg-color"]) || "#ffffff";
    const accentTextColor = getAccessibleTextColor(state.currentAccentColor);
    const accentToBackground = getContrastRatio(state.currentAccentColor, themeBackground);
    const accentToText = getContrastRatio(state.currentAccentColor, accentTextColor);
    const warnings = [];

    if (accentToBackground < 2.8) {
        warnings.push("Accent blends into this theme.");
    }

    if (accentToText < 4.5) {
        warnings.push("Filled buttons may be hard to read.");
    }

    warningEl.style.display = warnings.length ? "block" : "none";
    warningEl.textContent = warnings.length
        ? `${warnings.join(" ")} Try a lighter or darker accent.`
        : "";
}
