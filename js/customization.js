

/* ========================================
   CUSTOMIZATION OVERLAY SYSTEM
   ======================================== */

(function () {
    "use strict";

    // Storage keys
    const STORAGE_KEYS = {
        THEME: "customization-theme",
        ACCENT_COLOR: "customization-accent-color",
        FONT: "customization-font",
        COLOR_PRESETS: "customization-color-presets",
        SAVED_PRESETS: "customization-saved-presets",
        UI_SETTINGS: "customization-ui-settings",
        A11Y_SETTINGS: "customization-a11y-settings",
        CUSTOM_FONTS: "custom-fonts",
        ADVANCED_SETTINGS: "advancedSettings" // Shared with other modules
    };

    // Default color presets
    const DEFAULT_COLOR_PRESETS = ["#6196ff", "#ff6b6b", "#f59e0b", "#51d88a", "#a855f7"];

    // Default UI Settings
    const DEFAULT_UI_SETTINGS = {
        borderRadius: 16,
        glassIntensity: 80,
        compactMode: false,
        minimalCells: false,
        bgImage: '',
        mobileNavScroll: false,
        hideEmptyDays: false,
        bgPattern: false
    };

    // Default A11y Settings
    const DEFAULT_A11Y_SETTINGS = {
        highContrast: false,
        reducedMotion: false,
        focusIndicators: false,
        grayscale: false,
        textScale: 1
    };

    // Default Advanced Settings
    const DEFAULT_ADVANCED_SETTINGS = {
        interactionMode: 'link',
        shortcut1: 'customization',
        shortcut2: 'weather'
    };

    // State
    let currentTheme = "auto";
    let currentAccentColor = "#6196ff";
    let currentFont = "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
    let colorPresets = [...DEFAULT_COLOR_PRESETS];
    let savedPresets = [];
    let themeDefinitions = [];
    let uiSettings = { ...DEFAULT_UI_SETTINGS };
    let a11ySettings = { ...DEFAULT_A11Y_SETTINGS };
    let advancedSettings = { ...DEFAULT_ADVANCED_SETTINGS };

    // Google Fonts link element
    let googleFontsLink = null;

    // Initialize
    async function init() {
        await loadThemesFromJSON();
        loadSettings();
        applySettings(); // Applies everything
        setupEventListeners();
        renderColorPresets();
        renderRecommendedColors();
        renderSavedPresets();
        renderThemeCards();
        renderGallery();
        setupGoogleFonts();
        loadSavedCustomFonts();
        checkColorContrast();
        initializeBaseControls();
        
        // Initial input sync
        syncInputs();
    }

    async function loadThemesFromJSON() {
        const dataPath = window.DATA_PATH || 'data/';
        try {
            const response = await fetch(`${dataPath}themes.json`);
            const data = await response.json();
            themeDefinitions = data.themes;
            
            // Initialize savedPresets with defaults if empty
            if (localStorage.getItem(STORAGE_KEYS.SAVED_PRESETS) === null) {
                savedPresets = data.defaultPresets.map(p => ({
                    ...p,
                    ui: { ...DEFAULT_UI_SETTINGS },
                    a11y: { ...DEFAULT_A11Y_SETTINGS },
                    timestamp: Date.now()
                }));
                localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(savedPresets));
            }
        } catch (error) {
            console.error("Error loading themes data:", error);
        }
    }

    // Load settings from localStorage
    function loadSettings() {
        currentTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "auto";
        currentAccentColor = localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) || "#6196ff";
        currentFont = localStorage.getItem(STORAGE_KEYS.FONT) || "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

        const savedColorPresets = localStorage.getItem(STORAGE_KEYS.COLOR_PRESETS);
        if (savedColorPresets) {
            try { colorPresets = JSON.parse(savedColorPresets); } catch (e) { colorPresets = [...DEFAULT_COLOR_PRESETS]; }
        }

        const savedPresetsData = localStorage.getItem(STORAGE_KEYS.SAVED_PRESETS);
        if (savedPresetsData) {
            try { savedPresets = JSON.parse(savedPresetsData); } catch (e) { savedPresets = []; }
        }

        const savedUISettings = localStorage.getItem(STORAGE_KEYS.UI_SETTINGS);
        if (savedUISettings) {
             try { uiSettings = { ...DEFAULT_UI_SETTINGS, ...JSON.parse(savedUISettings) }; } catch (e) { uiSettings = { ...DEFAULT_UI_SETTINGS }; }
        }

        const savedA11ySettings = localStorage.getItem(STORAGE_KEYS.A11Y_SETTINGS);
        if (savedA11ySettings) {
             try { a11ySettings = { ...DEFAULT_A11Y_SETTINGS, ...JSON.parse(savedA11ySettings) }; } catch (e) { a11ySettings = { ...DEFAULT_A11Y_SETTINGS }; }
        }

        const savedAdvanced = localStorage.getItem(STORAGE_KEYS.ADVANCED_SETTINGS);
        if (savedAdvanced) {
             try { advancedSettings = { ...DEFAULT_ADVANCED_SETTINGS, ...JSON.parse(savedAdvanced) }; } catch (e) { advancedSettings = { ...DEFAULT_ADVANCED_SETTINGS }; }
        }
    }

    function syncInputs() {
        // Colors
        const colorPicker = document.getElementById("customColorPicker");
        const hexInput = document.getElementById("colorHexInput");
        if (colorPicker) colorPicker.value = currentAccentColor;
        if (hexInput) hexInput.value = currentAccentColor.toUpperCase();

        // Font
        const fontSelect = document.getElementById("fontSelect");
        if (fontSelect) fontSelect.value = currentFont;

        // UI
        document.getElementById("uiBorderRadius").value = uiSettings.borderRadius;
        document.getElementById("uiGlassIntensity").value = uiSettings.glassIntensity;
        document.getElementById("uiCompactMode").checked = uiSettings.compactMode;
        document.getElementById("uiMinimalCells").checked = uiSettings.minimalCells;
        document.getElementById("uiBgImage").value = uiSettings.bgImage;
        document.getElementById("uiMobileNavScroll").checked = uiSettings.mobileNavScroll || false;
        document.getElementById("uiHideEmptyDays").checked = uiSettings.hideEmptyDays || false;
        document.getElementById("uiBgPattern").checked = uiSettings.bgPattern || false;

        // A11y
        document.getElementById("a11yHighContrast").checked = a11ySettings.highContrast;
        document.getElementById("a11yReducedMotion").checked = a11ySettings.reducedMotion;
        document.getElementById("a11yFocusIndicators").checked = a11ySettings.focusIndicators;
        document.getElementById("a11yGrayscale").checked = a11ySettings.grayscale;
        document.getElementById("a11yTextScale").value = a11ySettings.textScale;

        // Advanced
        const modeLinkBtn = document.getElementById("modeLinkBtn");
        const modeMarkBtn = document.getElementById("modeMarkBtn");
        const modeText = document.getElementById("currentModeText");
        
        if (modeLinkBtn && modeMarkBtn) {
            modeLinkBtn.classList.toggle("active", advancedSettings.interactionMode === 'link');
            modeMarkBtn.classList.toggle("active", advancedSettings.interactionMode === 'mark');
        }
        if (modeText) {
            modeText.textContent = advancedSettings.interactionMode === 'link' ? "Open Textbook" : "Mark Subject";
        }

        const sc1 = document.getElementById("shortcut1Select");
        const sc2 = document.getElementById("shortcut2Select");
        if (sc1) sc1.value = advancedSettings.shortcut1;
        if (sc2) sc2.value = advancedSettings.shortcut2;
    }

    // Apply settings
    function applySettings() {
        applyTheme(currentTheme);
        applyAccentColor(currentAccentColor);
        applyFont(currentFont);
        applyUISettings();
        applyA11ySettings();
        updateUISelections();
    }

    // --- LOGIC: THEMES ---
    function applyTheme(themeId) {
        currentTheme = themeId;
        let activeThemeId = themeId;
        if (themeId === "auto") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            activeThemeId = prefersDark ? "dark" : "light";
        }

        document.body.setAttribute("data-theme", activeThemeId);

        const themeDef = themeDefinitions.find(t => t.id === activeThemeId);
        const root = document.documentElement;
        if (themeDef && themeDef.colors) {
            Object.entries(themeDef.colors).forEach(([variable, value]) => {
                root.style.setProperty(variable, value);
            });
        }
        
        // Re-apply background image if exists, as theme might overwrite bg properties
        if (uiSettings.bgImage) {
            document.body.style.backgroundImage = `url('${uiSettings.bgImage}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
        } else if (themeDef && !themeDef.colors["--bg-image"]) {
            // Reset to default theme bg if no custom image
             document.body.style.backgroundImage = '';
        }

        localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
        updateFavicon(currentAccentColor);
        checkColorContrast();
        renderRecommendedColors(); // Re-render recs on theme change
        if (window.applyAutoTintedText) window.applyAutoTintedText();
    }

    // --- LOGIC: ACCENT COLOR ---
    function applyAccentColor(color) {
        currentAccentColor = color;
        document.documentElement.style.setProperty("--accent-color", color);
        localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, color);
        updateFavicon(color);

        const colorPicker = document.getElementById("customColorPicker");
        const hexInput = document.getElementById("colorHexInput");
        if (colorPicker) colorPicker.value = color;
        if (hexInput) hexInput.value = color.toUpperCase();

        updateButtonTextColors();
        checkColorContrast();
        updateUISelections();
        if (window.applyAutoTintedText) window.applyAutoTintedText();
    }

    // --- LOGIC: FONT ---
    function applyFont(font) {
        currentFont = font;
        document.documentElement.style.setProperty("--font-family", font);
        localStorage.setItem(STORAGE_KEYS.FONT, font);
        
        const preview = document.getElementById("fontPreview");
        if (preview) preview.style.fontFamily = font;
        loadGoogleFont(font);
    }

    // --- LOGIC: UI SETTINGS ---
    function applyUISettings() {
        const root = document.documentElement;
        
        // Border Radius
        root.style.setProperty("--border-radius", `${uiSettings.borderRadius}px`);
        
        // Glass Intensity
        const glassVal = uiSettings.glassIntensity / 100;
        const blurVal = 20 * glassVal;
        root.style.setProperty("--backdrop-blur", `${blurVal}px`);
        
        // Classes
        document.body.classList.toggle("compact-timetable", uiSettings.compactMode);
        document.body.classList.toggle("minimal-cells", uiSettings.minimalCells);
        document.body.classList.toggle("hide-empty-days", uiSettings.hideEmptyDays);
        document.body.classList.toggle("bg-pattern", uiSettings.bgPattern);
        document.body.classList.toggle("mobile-nav-scroll", uiSettings.mobileNavScroll);

        // Background
        if (uiSettings.bgImage) {
            document.body.style.backgroundImage = `url('${uiSettings.bgImage}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        } else {
            document.body.style.backgroundImage = '';
        }

        localStorage.setItem(STORAGE_KEYS.UI_SETTINGS, JSON.stringify(uiSettings));
        if (window.applyAutoTintedText) window.applyAutoTintedText();
    }

    // --- LOGIC: ACCESSIBILITY ---
    function applyA11ySettings() {
        const root = document.documentElement;
        
        document.body.classList.toggle("high-contrast", a11ySettings.highContrast);
        document.body.classList.toggle("reduced-motion", a11ySettings.reducedMotion);
        document.body.classList.toggle("focus-indicators", a11ySettings.focusIndicators);
        document.body.classList.toggle("grayscale", a11ySettings.grayscale);
        
        root.style.setProperty("--font-scale", a11ySettings.textScale);

        localStorage.setItem(STORAGE_KEYS.A11Y_SETTINGS, JSON.stringify(a11ySettings));
    }

    // --- LOGIC: ADVANCED ---
    function applyAdvancedSettings(newSettings) {
        advancedSettings = { ...advancedSettings, ...newSettings };
        localStorage.setItem(STORAGE_KEYS.ADVANCED_SETTINGS, JSON.stringify(advancedSettings));
        syncInputs();
        
        // Notify Mobile Nav if shortcuts changed
        if ((newSettings.shortcut1 || newSettings.shortcut2) && window.mobileNav && window.mobileNav.updateShortcutButtons) {
            window.mobileNav.updateShortcutButtons();
        }
    }

    // --- ALGORITHMIC COLORS ---
    
    // --- COLOR UTILS ---
    function hexToHSL(H) {
        let r = 0, g = 0, b = 0;
        if (H.length == 4) {
            r = "0x" + H[1] + H[1];
            g = "0x" + H[2] + H[2];
            b = "0x" + H[3] + H[3];
        } else if (H.length == 7) {
            r = "0x" + H[1] + H[2];
            g = "0x" + H[3] + H[4];
            b = "0x" + H[5] + H[6];
        }
        r /= 255; g /= 255; b /= 255;
        let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
        let h = 0, s = 0, l = 0;

        if (delta == 0) h = 0;
        else if (cmax == r) h = ((g - b) / delta) % 6;
        else if (cmax == g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;

        h = Math.round(h * 60);
        if (h < 0) h += 360;

        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);

        return {h, s, l};
    }

    function HSLToHex(h,s,l) {
        s /= 100;
        l /= 100;
        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
            m = l - c / 2,
            r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) { r = c; g = x; b = 0; }
        else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
        else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
        else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
        else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
        else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

        r = Math.round((r + m) * 255).toString(16);
        g = Math.round((g + m) * 255).toString(16);
        b = Math.round((b + m) * 255).toString(16);

        if (r.length == 1) r = "0" + r;
        if (g.length == 1) g = "0" + g;
        if (b.length == 1) b = "0" + b;

        return "#" + r + g + b;
    }

    function getLuminance(hex) {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >>  8) & 0xff;
        const b = (rgb >>  0) & 0xff;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function generateDynamicColors(bgHex) {
        if (!bgHex) return ["#ff0000", "#00ff00", "#0000ff"]; // Fallback
        
        const hsl = hexToHSL(bgHex);
        const lum = getLuminance(bgHex);
        const isDark = lum < 128;
        
        // 1. Complementary (High saturation, adjusted lightness)
        // If neutral (S < 10), assume Blue as base for complement -> Orange/Gold
        let baseH = hsl.s < 10 ? 210 : hsl.h;
        let compH = (baseH + 180) % 360;
        let compColor = HSLToHex(compH, 85, isDark ? 60 : 45);

        // 2. Niche (Split Complementary / Shifted Hue)
        // Shift hue by 150deg
        let nicheH = (baseH + 150) % 360;
        let nicheColor = HSLToHex(nicheH, 80, isDark ? 65 : 40);

        // 3. Contrast
        // If dark bg, bright contrast. If light bg, dark contrast.
        let contrastH = (baseH + 90) % 360; 
        let contrastColor = HSLToHex(contrastH, 90, isDark ? 80 : 30);

        return [compColor, nicheColor, contrastColor];
    }

    function renderRecommendedColors() {
        const grid = document.getElementById("recommendedColorsGrid");
        if (!grid) return;

        let activeThemeId = currentTheme;
        if (activeThemeId === "auto") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            activeThemeId = prefersDark ? "dark" : "light";
        }
        
        const themeDef = themeDefinitions.find(t => t.id === activeThemeId);
        if (!themeDef) return;

        // 1. Curated Theme Colors
        const curated = themeDef.recommendedColors || [];

        // 2. Algorithmic Colors based on Background
        const bgColor = themeDef.colors["--bg-color"] || "#ffffff";
        const dynamic = generateDynamicColors(bgColor);

        const allRecommendations = [...new Set([...curated, ...dynamic])]; // Deduplicate

        grid.innerHTML = "";
        allRecommendations.forEach(color => {
            const item = createColorItem(color);
            grid.appendChild(item);
        });
    }

    function createColorItem(color) {
        const item = document.createElement("div");
        item.className = "preset-item";
        item.style.background = color;
        // Check if color is active (ignoring case)
        if (color.toLowerCase() === currentAccentColor.toLowerCase()) item.classList.add("active");
        item.onclick = () => applyAccentColor(color);
        return item;
    }

    // --- PRESETS LOGIC ---
    function getCurrentPreset() {
        return {
            name: "Custom Preset",
            theme: currentTheme,
            accentColor: currentAccentColor,
            font: currentFont,
            ui: { ...uiSettings },
            a11y: { ...a11ySettings },
            timestamp: Date.now(),
        };
    }

    function saveCurrentPreset() {
        const name = prompt("Enter a name for this preset:");
        if (!name) return;

        const preset = {
            ...getCurrentPreset(),
            name: name.trim()
        };

        savedPresets.push(preset);
        renderSavedPresets();
        localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(savedPresets));
    }

    function applyPreset(preset) {
        currentTheme = preset.theme;
        currentAccentColor = preset.accentColor;
        currentFont = preset.font;
        // Merge with defaults to ensure new fields don't break old presets
        uiSettings = { ...DEFAULT_UI_SETTINGS, ...preset.ui };
        a11ySettings = { ...DEFAULT_A11Y_SETTINGS, ...preset.a11y };

        applySettings();
        syncInputs();
    }

    // --- GALLERY LOGIC ---
    function renderGallery() {
        const grid = document.getElementById("galleryGrid");
        if (!grid) return;

        // Mock Data
        const galleryItems = [
            { name: "Oceanic Depth", author: "DevTeam", theme: "ocean", accent: "#00aaff", font: "'Outfit', sans-serif" },
            { name: "Neon Cyber", author: "GlitchUser", theme: "cyberpunk", accent: "#00f0ff", font: "'Space Grotesk', sans-serif" },
            { name: "Forest Hike", author: "NatureLvr", theme: "forest", accent: "#4ade80", font: "'DM Sans', sans-serif" },
            { name: "Royal Purple", author: "QueenBee", theme: "deep-purple", accent: "#ab47bc", font: "'Playfair Display', serif" },
            { name: "Minimalist", author: "CleanDesk", theme: "light", accent: "#333333", font: "'Inter', sans-serif" },
            { name: "Night Owl", author: "Coder123", theme: "midnight", accent: "#f59e0b", font: "'JetBrains Mono', monospace" }
        ];

        grid.innerHTML = galleryItems.map(item => `
            <div class="gallery-item" data-theme="${item.theme}" data-accent="${item.accent}" data-font="${item.font}">
                <div class="gallery-preview" style="--p-bg: var(--bg-color); --p-card: var(--card-bg); --p-accent: ${item.accent}">
                    <div class="gallery-preview-circle">Aa</div>
                </div>
                <div class="gallery-info">
                    <div class="gallery-name">${item.name}</div>
                    <div class="gallery-desc">by ${item.author}</div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll(".gallery-item").forEach((el, idx) => {
            el.addEventListener("click", () => {
                const item = galleryItems[idx];
                applyPreset({
                    theme: item.theme,
                    accentColor: item.accent,
                    font: item.font,
                    ui: DEFAULT_UI_SETTINGS,
                    a11y: DEFAULT_A11Y_SETTINGS
                });
            });
        });
    }

    // --- FILTER THEMES LOGIC ---
    function filterThemes(searchTerm, tag) {
        const container = document.querySelector(".theme-options");
        if (!container) return;

        container.innerHTML = "";
        
        const filtered = themeDefinitions.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTag = tag === 'all' || (t.tags && t.tags.includes(tag));
            return matchesSearch && matchesTag;
        });

        filtered.forEach(theme => {
            const card = document.createElement("div");
            card.className = "theme-card";
            card.dataset.theme = theme.id;
            if (theme.id === currentTheme) card.classList.add("active");

            card.innerHTML = `
                <div class="theme-icon">${theme.icon}</div>
                <div class="theme-name">${theme.name}</div>
                <div class="theme-description">${theme.description}</div>
            `;

            card.addEventListener("click", () => {
                applyTheme(theme.id);
                updateUISelections();
            });

            container.appendChild(card);
        });
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Overlay Controls
        const customBtn = document.getElementById("customizationBtn");
        const sheetBtn = document.getElementById("sheetCustomizationBtn");
        const closeBtn = document.getElementById("closeCustomization");
        const overlay = document.getElementById("customizationOverlay");

        const openFn = () => {
            if (window.overlayManager) {
                window.overlayManager.close("sideMenu");
                window.overlayManager.open("customizationOverlay");
            }
        };

        if (customBtn) customBtn.addEventListener("click", openFn);
        if (sheetBtn) sheetBtn.addEventListener("click", openFn);
        if (closeBtn) closeBtn.addEventListener("click", () => window.overlayManager.close("customizationOverlay"));

        // Register with Manager
        if (window.overlayManager) window.overlayManager.register("customizationOverlay");

        // Sidebar Navigation
        document.querySelectorAll(".sidebar-item").forEach(item => {
            item.addEventListener("click", () => {
                document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                document.querySelectorAll(".custom-section").forEach(s => s.classList.remove("active"));
                const section = document.getElementById(item.dataset.section + "Section");
                if (section) section.classList.add("active");
            });
        });

        // Theme Filtering
        const searchInput = document.getElementById("themeSearch");
        const tags = document.querySelectorAll(".theme-tag");
        let activeTag = "all";

        if (searchInput) {
            searchInput.addEventListener("input", (e) => filterThemes(e.target.value, activeTag));
        }
        
        tags.forEach(btn => {
            btn.addEventListener("click", () => {
                tags.forEach(t => t.classList.remove("active"));
                btn.classList.add("active");
                activeTag = btn.dataset.tag;
                filterThemes(searchInput ? searchInput.value : "", activeTag);
            });
        });

        // Color Inputs
        document.getElementById("customColorPicker")?.addEventListener("input", (e) => applyAccentColor(e.target.value));
        document.getElementById("colorHexInput")?.addEventListener("change", (e) => {
             let val = e.target.value;
             if (!val.startsWith("#")) val = "#" + val;
             if (/^#[0-9A-F]{6}$/i.test(val)) applyAccentColor(val);
        });
        document.getElementById("randomColorBtn")?.addEventListener("click", () => {
             applyAccentColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"));
        });
        document.getElementById("addColorPreset")?.addEventListener("click", () => addColorPreset(currentAccentColor));

        // Font Input
        document.getElementById("fontSelect")?.addEventListener("change", (e) => applyFont(e.target.value));

        // UI Inputs
        document.getElementById("uiBorderRadius")?.addEventListener("input", (e) => {
            uiSettings.borderRadius = parseInt(e.target.value);
            applyUISettings();
        });
        document.getElementById("uiGlassIntensity")?.addEventListener("input", (e) => {
            uiSettings.glassIntensity = parseInt(e.target.value);
            applyUISettings();
        });
        document.getElementById("uiCompactMode")?.addEventListener("change", (e) => {
            uiSettings.compactMode = e.target.checked;
            applyUISettings();
        });
        document.getElementById("uiMinimalCells")?.addEventListener("change", (e) => {
            uiSettings.minimalCells = e.target.checked;
            applyUISettings();
        });
        document.getElementById("uiBgImage")?.addEventListener("change", (e) => {
            uiSettings.bgImage = e.target.value;
            applyUISettings();
        });
        document.getElementById("uiBgClear")?.addEventListener("click", () => {
             uiSettings.bgImage = '';
             document.getElementById("uiBgImage").value = '';
             applyUISettings();
        });
        document.getElementById("uiMobileNavScroll")?.addEventListener("change", (e) => {
            uiSettings.mobileNavScroll = e.target.checked;
            applyUISettings();
        });
        document.getElementById("uiHideEmptyDays")?.addEventListener("change", (e) => {
            uiSettings.hideEmptyDays = e.target.checked;
            applyUISettings();
        });
        document.getElementById("uiBgPattern")?.addEventListener("change", (e) => {
            uiSettings.bgPattern = e.target.checked;
            applyUISettings();
        });

        // A11y Inputs
        document.getElementById("a11yHighContrast")?.addEventListener("change", (e) => {
            a11ySettings.highContrast = e.target.checked;
            applyA11ySettings();
        });
        document.getElementById("a11yReducedMotion")?.addEventListener("change", (e) => {
            a11ySettings.reducedMotion = e.target.checked;
            applyA11ySettings();
        });
        document.getElementById("a11yFocusIndicators")?.addEventListener("change", (e) => {
            a11ySettings.focusIndicators = e.target.checked;
            applyA11ySettings();
        });
        document.getElementById("a11yGrayscale")?.addEventListener("change", (e) => {
            a11ySettings.grayscale = e.target.checked;
            applyA11ySettings();
        });
        document.getElementById("a11yTextScale")?.addEventListener("input", (e) => {
            a11ySettings.textScale = parseFloat(e.target.value);
            applyA11ySettings();
        });

        // Advanced Inputs
        document.getElementById("modeLinkBtn")?.addEventListener("click", () => applyAdvancedSettings({ interactionMode: 'link' }));
        document.getElementById("modeMarkBtn")?.addEventListener("click", () => applyAdvancedSettings({ interactionMode: 'mark' }));
        
        document.getElementById("shortcut1Select")?.addEventListener("change", (e) => applyAdvancedSettings({ shortcut1: e.target.value }));
        document.getElementById("shortcut2Select")?.addEventListener("change", (e) => applyAdvancedSettings({ shortcut2: e.target.value }));

        // Presets Tabs
        document.querySelectorAll(".preset-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".preset-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                document.querySelectorAll(".presets-content-wrapper").forEach(c => c.classList.remove("active"));
                document.getElementById(btn.dataset.tab + "Content").classList.add("active");
            });
        });
        
        // UI Tabs (New)
        document.querySelectorAll(".ui-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".ui-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                document.querySelectorAll(".ui-content-wrapper").forEach(c => c.classList.remove("active"));
                document.getElementById(btn.dataset.tab + "Content").classList.add("active");
            });
        });

        document.getElementById("savePresetBtn")?.addEventListener("click", saveCurrentPreset);
        
        // Export / Import
        document.getElementById("exportPresetBtn")?.addEventListener("click", () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getCurrentPreset(), null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "orar-8d-preset.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });

        document.getElementById("importPresetBtn")?.addEventListener("click", () => {
            document.getElementById("importPresetFile").click();
        });

        document.getElementById("importPresetFile")?.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const preset = JSON.parse(ev.target.result);
                    applyPreset(preset);
                    e.target.value = ''; // Reset
                } catch (err) {
                    alert("Invalid preset file.");
                }
            };
            reader.readAsText(file);
        });
    }

    // Helper: Render Color Presets
    function renderColorPresets() {
        const grid = document.getElementById("colorPresetsGrid");
        if (!grid) return;
        grid.innerHTML = "";
        colorPresets.forEach(color => {
            const item = createColorItem(color);
            // Delete logic
            const del = document.createElement("button");
            del.className = "preset-delete";
            del.innerHTML = "<i class='fa-solid fa-trash'></i>";
            del.onclick = (e) => { e.stopPropagation(); deleteColorPreset(color); };
            item.appendChild(del);
            grid.appendChild(item);
        });
        localStorage.setItem(STORAGE_KEYS.COLOR_PRESETS, JSON.stringify(colorPresets));
    }

    function addColorPreset(color) {
        if (!colorPresets.includes(color.toLowerCase())) {
            colorPresets.push(color.toLowerCase());
            renderColorPresets();
        }
    }

    function deleteColorPreset(color) {
        if (colorPresets.length > 1) {
            colorPresets = colorPresets.filter(c => c !== color);
            renderColorPresets();
        }
    }

    // Helper: Update UI Selections (active states)
    function updateUISelections() {
        document.querySelectorAll(".theme-card").forEach(c => c.classList.toggle("active", c.dataset.theme === currentTheme));
        document.querySelectorAll(".preset-item").forEach(c => c.classList.toggle("active", c.style.background === currentAccentColor || c.style.backgroundColor === currentAccentColor));
    }

    // Helper: Render Saved Presets
    function renderSavedPresets() {
        const grid = document.getElementById("savedPresetsGrid");
        if (!grid) return;
        grid.innerHTML = "";
        
        savedPresets.forEach((p, idx) => {
             const card = document.createElement("div");
             card.className = "preset-card";
             card.innerHTML = `
                <div class="preset-card-header">
                    <div class="preset-card-name">${p.name}</div>
                    <div class="preset-card-actions">
                        <button class="preset-card-btn delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="preset-card-details">
                    <div class="preset-detail"><span class="preset-color-dot" style="background:${p.accentColor}"></span><span>${p.theme}</span></div>
                    <div class="preset-detail"><i class="fa-solid fa-font"></i><span>${p.font.split(',')[0]}</span></div>
                </div>
             `;
             card.onclick = (e) => { 
                 if(e.target.closest('.delete')) return;
                 applyPreset(p); 
             };
             card.querySelector('.delete').onclick = () => {
                 savedPresets.splice(idx, 1);
                 renderSavedPresets();
                 localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(savedPresets));
             };
             grid.appendChild(card);
        });
    }

    // --- UTILS ---
    function checkColorContrast() {
        const warningEl = document.getElementById("contrastWarning");
        if (!warningEl) return;
        
        const r = parseInt(currentAccentColor.slice(1, 3), 16);
        const g = parseInt(currentAccentColor.slice(3, 5), 16);
        const b = parseInt(currentAccentColor.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        
        // Simple heuristic: if light theme & light color, or dark theme & dark color
        const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' || 
                           (currentTheme === 'auto' && window.matchMedia("(prefers-color-scheme: dark)").matches) ||
                           ['space', 'midnight', 'forest', 'ocean'].includes(currentTheme);

        let warn = false;
        if (isDarkTheme && yiq < 50) warn = true;
        if (!isDarkTheme && yiq > 200) warn = true;

        warningEl.style.display = warn ? "block" : "none";
        warningEl.textContent = warn ? "Warning: Low contrast with background." : "";
    }

    function updateButtonTextColors() {
        // Logic to flip text color based on accent brightness
        const r = parseInt(currentAccentColor.slice(1, 3), 16);
        const g = parseInt(currentAccentColor.slice(3, 5), 16);
        const b = parseInt(currentAccentColor.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const textColor = (yiq >= 128) ? 'black' : 'white';
        
        document.querySelectorAll('.add-preset-btn, .refresh-weather-btn').forEach(btn => {
            btn.style.color = textColor;
        });
    }

    function updateFavicon(color) {
        const canvas = document.createElement("canvas");
        canvas.width = 16; canvas.height = 16;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(8, 8, 8, 0, 2 * Math.PI); ctx.fill();
        const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
        link.rel = "icon"; link.href = canvas.toDataURL();
        document.head.appendChild(link);
    }
    
    // Theme Card Rendering
    function renderThemeCards() {
        filterThemes("", "all");
    }

    // Google Fonts
    function setupGoogleFonts() {
        if (!googleFontsLink) {
            googleFontsLink = document.createElement("link");
            googleFontsLink.rel = "stylesheet";
            googleFontsLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;600;700&family=Ubuntu:wght@400;500;700&family=Nunito:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Fira+Code:wght@400;600&display=swap";
            document.head.appendChild(googleFontsLink);
        }
    }
    
    function loadGoogleFont(fontFamily) {
         // Logic to lazy load if not in main bundle (mocked for this scope)
    }

    function loadSavedCustomFonts() {
        const fonts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_FONTS) || "[]");
        const select = document.getElementById("fontSelect");
        if(!select) return;
        fonts.forEach(f => {
            const opt = document.createElement("option");
            opt.value = `'${f}', sans-serif`;
            opt.textContent = f + " (Custom)";
            select.appendChild(opt);
        });
    }

    // Global Access
    window.addCustomGoogleFont = function() {
        const name = prompt("Font Name (Google Fonts):");
        if(name) {
            const link = document.createElement("link");
            link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}&display=swap`;
            link.rel = "stylesheet";
            document.head.appendChild(link);
            
            const fonts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_FONTS) || "[]");
            if(!fonts.includes(name)) {
                fonts.push(name);
                localStorage.setItem(STORAGE_KEYS.CUSTOM_FONTS, JSON.stringify(fonts));
                
                const select = document.getElementById("fontSelect");
                const opt = document.createElement("option");
                opt.value = `'${name}', sans-serif`;
                opt.textContent = name + " (Custom)";
                select.appendChild(opt);
                select.value = opt.value;
                applyFont(opt.value);
            }
        }
    };
    
    document.getElementById("addCustomFont")?.addEventListener("click", window.addCustomGoogleFont);

    // ========================================
    // DEV MODE
    // ========================================

    const DEV_MODE_KEY = "dev-mode-enabled";
    const DEV_TIME_OVERRIDE_KEY = "dev-time-override";
    const DEV_WEATHER_OVERRIDE_KEY = "dev-weather-override";
    const DEV_DAY_OVERRIDE_KEY = "dev-day-override";

    let devModeEnabled = localStorage.getItem(DEV_MODE_KEY) === "true";
    let devTimeOverride = localStorage.getItem(DEV_TIME_OVERRIDE_KEY) ? new Date(localStorage.getItem(DEV_TIME_OVERRIDE_KEY)) : null;
    let devWeatherOverride = localStorage.getItem(DEV_WEATHER_OVERRIDE_KEY) || null;
    let devDayOverride = localStorage.getItem(DEV_DAY_OVERRIDE_KEY) ? parseInt(localStorage.getItem(DEV_DAY_OVERRIDE_KEY), 10) : null;

    // Initialize dev mode
    function initDevMode() {
        const devModeToggle = document.getElementById("devModeToggle");
        const devModeControls = document.getElementById("devModeControls");
        const devApplyTimeBtn = document.getElementById("devApplyTimeBtn");
        const devResetTimeBtn = document.getElementById("devResetTimeBtn");
        const devApplyWeatherBtn = document.getElementById("devApplyWeatherBtn");
        const devResetWeatherBtn = document.getElementById("devResetWeatherBtn");
        const devApplyDayBtn = document.getElementById("devApplyDayBtn");
        const devResetDayBtn = document.getElementById("devResetDayBtn");
        const devRefreshHighlightBtn = document.getElementById("devRefreshHighlightBtn");
        const devReloadDataBtn = document.getElementById("devReloadDataBtn");
        const devViewTodayBtn = document.getElementById("devViewTodayBtn");
        const devResetAllBtn = document.getElementById("devResetAllBtn");
        const devTimeInput = document.getElementById("devTimeInput");
        const devDaySelect = document.getElementById("devDaySelect");

        if (!devModeToggle) return;

        // Set initial state
        devModeToggle.checked = devModeEnabled;
        if (devModeEnabled && devModeControls) {
            devModeControls.style.display = "block";
        }
        // Show/hide base tab when dev mode is enabled
        const baseTabItem = document.querySelector('.sidebar-item[data-section="base"]');
        const baseSection = document.getElementById("baseSection");

        function updateBaseTabVisibility() {
            if (baseTabItem) {
                baseTabItem.style.display = devModeEnabled ? "flex" : "none";
            }
        }

        updateBaseTabVisibility();

        // Toggle dev mode
        devModeToggle.addEventListener("change", (e) => {
            devModeEnabled = e.target.checked;
            localStorage.setItem(DEV_MODE_KEY, devModeEnabled);
            if (devModeControls) {
                devModeControls.style.display = devModeEnabled ? "block" : "none";
            }
            // Show/hide base tab when toggling dev mode
            updateBaseTabVisibility();
            updateDevInfo();
        });

        // Time controls
        if (devApplyTimeBtn) {
            devApplyTimeBtn.addEventListener("click", () => {
                const timeStr = devTimeInput?.value;
                if (!timeStr) {
                    alert("Please select a time");
                    return;
                }
                const [hours, minutes] = timeStr.split(":").map(Number);
                const overrideDate = new Date();
                overrideDate.setHours(hours, minutes, 0, 0);
                devTimeOverride = overrideDate;
                localStorage.setItem(DEV_TIME_OVERRIDE_KEY, overrideDate.toISOString());
                updateDevInfo();
                // Trigger refresh of highlighting
                if (window.highlightCurrent) window.highlightCurrent();
                if (window.updateRecommendedManual) window.updateRecommendedManual();
                const timeInfoEl = document.getElementById("devTimeInfo");
                if (timeInfoEl) timeInfoEl.innerHTML = `Current override: <strong>${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}</strong>`;
            });
        }

        if (devResetTimeBtn) {
            devResetTimeBtn.addEventListener("click", () => {
                devTimeOverride = null;
                localStorage.removeItem(DEV_TIME_OVERRIDE_KEY);
                devTimeInput.value = "";
                updateDevInfo();
                // Trigger refresh of highlighting
                if (window.highlightCurrent) window.highlightCurrent();
                if (window.updateRecommendedManual) window.updateRecommendedManual();
                const timeInfoEl = document.getElementById("devTimeInfo");
                if (timeInfoEl) timeInfoEl.innerHTML = `Current override: <strong>None</strong>`;
            });
        }

        // Weather controls
        if (devApplyWeatherBtn) {
            devApplyWeatherBtn.addEventListener("click", () => {
                const weatherSelect = document.getElementById("devWeatherSelect");
                const code = weatherSelect?.value;
                if (!code) {
                    alert("Please select a weather condition");
                    return;
                }
                devWeatherOverride = code;
                localStorage.setItem(DEV_WEATHER_OVERRIDE_KEY, code);
                updateDevWeather(parseInt(code, 10));
                const weatherInfoEl = document.getElementById("devWeatherInfo");
                const weatherDesc = getWeatherDescriptionForCode(parseInt(code, 10));
                if (weatherInfoEl) weatherInfoEl.innerHTML = `Current override: <strong>${weatherDesc}</strong>`;
            });
        }

        if (devResetWeatherBtn) {
            devResetWeatherBtn.addEventListener("click", () => {
                devWeatherOverride = null;
                localStorage.removeItem(DEV_WEATHER_OVERRIDE_KEY);
                const weatherSelect = document.getElementById("devWeatherSelect");
                if (weatherSelect) weatherSelect.value = "";
                const weatherInfoEl = document.getElementById("devWeatherInfo");
                if (weatherInfoEl) weatherInfoEl.innerHTML = `Current override: <strong>None</strong>`;
                // Refetch real weather
                if (window.getWeather) window.getWeather();
            });
        }

        // Day controls
        if (devApplyDayBtn) {
            devApplyDayBtn.addEventListener("click", () => {
                if (!devDaySelect) {
                    alert("Day select element not found");
                    return;
                }
                const dayValue = devDaySelect.value;
                if (dayValue === "") {
                    alert("Please select a day");
                    return;
                }
                const dayNum = parseInt(dayValue, 10);
                devDayOverride = dayNum;
                localStorage.setItem(DEV_DAY_OVERRIDE_KEY, dayNum.toString());
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayInfoEl = document.getElementById("devDayInfo");
                if (dayInfoEl) dayInfoEl.innerHTML = `Current override: <strong>${dayNames[dayNum]}</strong>`;
                updateDevInfo();
                // Trigger refresh of highlighting
                if (window.highlightCurrent) window.highlightCurrent();
                if (window.fillToday) window.fillToday();
            });
        }

        if (devResetDayBtn) {
            devResetDayBtn.addEventListener("click", () => {
                devDayOverride = null;
                localStorage.removeItem(DEV_DAY_OVERRIDE_KEY);
                if (devDaySelect) devDaySelect.value = "";
                const dayInfoEl = document.getElementById("devDayInfo");
                if (dayInfoEl) dayInfoEl.innerHTML = `Current override: <strong>None</strong>`;
                updateDevInfo();
                // Trigger refresh of highlighting
                if (window.highlightCurrent) window.highlightCurrent();
                if (window.fillToday) window.fillToday();
            });
        }

        // Quick actions
        if (devRefreshHighlightBtn) {
            devRefreshHighlightBtn.addEventListener("click", () => {
                if (window.highlightCurrent) window.highlightCurrent();
                devRefreshHighlightBtn.innerHTML = '<i class="fa-solid fa-check"></i> Refreshed!';
                setTimeout(() => {
                    devRefreshHighlightBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh Highlighting';
                }, 1500);
            });
        }

        if (devReloadDataBtn) {
            devReloadDataBtn.addEventListener("click", () => {
                if (window.loadTimetableData) window.loadTimetableData();
                devReloadDataBtn.innerHTML = '<i class="fa-solid fa-check"></i> Reloaded!';
                setTimeout(() => {
                    devReloadDataBtn.innerHTML = '<i class="fa-solid fa-reload"></i> Reload Timetable Data';
                }, 1500);
            });
        }

        if (devViewTodayBtn) {
            devViewTodayBtn.addEventListener("click", () => {
                if (window.timetableData) {
                    const now = new Date();
                    const dayOfWeek = devDayOverride !== null ? devDayOverride : now.getDay();
                    const dayKeys = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const currentDayKey = dayKeys[dayOfWeek];
                    
                    if (currentDayKey) {
                        const todayClasses = window.timetableData.schedule
                            .map(row => ({ ...row, dayClass: row[currentDayKey] }))
                            .filter(row => row.dayClass)
                            .map(row => `${row.time}: ${row.dayClass.name}`)
                            .join("\n");
                        
                        if (todayClasses) {
                            const dayDisplayName = devDayOverride !== null ? `${dayNames[dayOfWeek]} (OVERRIDE)` : dayNames[dayOfWeek];
                            alert(`${dayDisplayName}'s Classes:\n\n${todayClasses}`);
                        } else {
                            alert("No classes on this day!");
                        }
                    } else {
                        alert("No classes on weekends!");
                    }
                } else {
                    alert("Timetable data not loaded");
                }
            });
        }

        if (devResetAllBtn) {
            devResetAllBtn.addEventListener("click", () => {
                if (confirm("Are you sure you want to reset ALL customization settings?")) {
                    // Reset all storage
                    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
                    localStorage.removeItem(DEV_MODE_KEY);
                    localStorage.removeItem(DEV_TIME_OVERRIDE_KEY);
                    localStorage.removeItem(DEV_WEATHER_OVERRIDE_KEY);
                    localStorage.removeItem(DEV_DAY_OVERRIDE_KEY);
                    // Reload page
                    window.location.reload();
                }
            });
        }

        // Restore overrides if they exist
        if (devTimeOverride && devTimeInput) {
            const hours = devTimeOverride.getHours();
            const minutes = devTimeOverride.getMinutes();
            devTimeInput.value = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
            const timeInfoEl = document.getElementById("devTimeInfo");
            if (timeInfoEl) timeInfoEl.innerHTML = `Current override: <strong>${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}</strong>`;
        }

        if (devWeatherOverride) {
            const weatherSelect = document.getElementById("devWeatherSelect");
            if (weatherSelect) weatherSelect.value = devWeatherOverride;
            const weatherDesc = getWeatherDescriptionForCode(parseInt(devWeatherOverride, 10));
            const weatherInfoEl = document.getElementById("devWeatherInfo");
            if (weatherInfoEl) weatherInfoEl.innerHTML = `Current override: <strong>${weatherDesc}</strong>`;
        }

        if (devDayOverride !== null && devDaySelect) {
            devDaySelect.value = devDayOverride.toString();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayInfoEl = document.getElementById("devDayInfo");
            if (dayInfoEl) dayInfoEl.innerHTML = `Current override: <strong>${dayNames[devDayOverride]}</strong>`;
        }

        // Update dev info every second
        setInterval(updateDevInfo, 1000);
        updateDevInfo(); // Initial update
    }

    function updateDevInfo() {
        const realTimeEl = document.getElementById("devInfoRealTime");
        const overrideTimeEl = document.getElementById("devInfoOverrideTime");
        const dayOfWeekEl = document.getElementById("devInfoDayOfWeek");
        const currentClassEl = document.getElementById("devInfoCurrentClass");

        const now = devTimeOverride || new Date();
        const realNow = new Date();

        if (realTimeEl) {
            const h = realNow.getHours().toString().padStart(2, "0");
            const m = realNow.getMinutes().toString().padStart(2, "0");
            const s = realNow.getSeconds().toString().padStart(2, "0");
            realTimeEl.textContent = `${h}:${m}:${s}`;
        }

        if (overrideTimeEl) {
            if (devTimeOverride) {
                const h = now.getHours().toString().padStart(2, "0");
                const m = now.getMinutes().toString().padStart(2, "0");
                overrideTimeEl.textContent = `${h}:${m}`;
            } else {
                overrideTimeEl.textContent = "None";
            }
        }

        if (dayOfWeekEl) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayIndex = devDayOverride !== null ? devDayOverride : now.getDay();
            dayOfWeekEl.textContent = days[dayIndex];
        }

        if (currentClassEl && window.timetableData) {
            const dayOfWeek = devDayOverride !== null ? devDayOverride : now.getDay();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const dayKeys = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            const currentDayKey = dayKeys[dayOfWeek];
            
            let currentClass = "None";
            if (currentDayKey) {
                for (const row of window.timetableData.schedule) {
                    const m = row.time.match(/^(\d{1,2}):(\d{2})/);
                    if (m) {
                        const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                        const windowStart = start - 10;
                        const windowEnd = start + 50;
                        if (currentMinutes >= windowStart && currentMinutes < windowEnd) {
                            const subject = row[currentDayKey];
                            if (subject) currentClass = subject.name;
                            break;
                        }
                    }
                }
            }
            currentClassEl.textContent = currentClass;
        }
    }

    // Initialize Base Controls
    function initializeBaseControls() {
        // Number Input Increment/Decrement
        const numberInputField = document.querySelector('.number-input-field');
        const numberBtns = document.querySelectorAll('.number-btn');
        if (numberInputField && numberBtns.length === 2) {
            numberBtns[0].addEventListener('click', () => {
                const current = parseInt(numberInputField.value) || 0;
                const min = parseInt(numberInputField.min) || 0;
                if (current > min) {
                    numberInputField.value = current - 1;
                }
            });
            
            numberBtns[1].addEventListener('click', () => {
                const current = parseInt(numberInputField.value) || 0;
                const max = parseInt(numberInputField.max) || 100;
                if (current < max) {
                    numberInputField.value = current + 1;
                }
            });
        }
        
        // Range Slider Value Display
        const rangeSlider = document.querySelector('.range-slider-demo');
        const rangeValue = document.querySelector('#rangeValue');
        if (rangeSlider && rangeValue) {
            const updateRangeValue = () => {
                rangeValue.textContent = rangeSlider.value;
            };
            rangeSlider.addEventListener('input', updateRangeValue);
        }
        
        // Color Picker Hex Display
        const colorPicker = document.getElementById('demoColorPicker');
        const colorValue = document.getElementById('demoColorValue');
        if (colorPicker && colorValue) {
            const updateColorValue = () => {
                colorValue.textContent = colorPicker.value.toUpperCase();
            };
            colorPicker.addEventListener('input', updateColorValue);
            colorPicker.addEventListener('change', updateColorValue);
        }
    }

    function getWeatherDescriptionForCode(code) {
        if (code === 0) return "☀️ Clear";
        if ([1, 2].includes(code)) return "🌤️ Partially Cloudy";
        if (code === 3) return "☁️ Cloudy";
        if ([45, 48].includes(code)) return "🌫️ Fog";
        if ([51, 53, 55, 56, 57].includes(code)) return "🌦️ Drizzle";
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️ Rain";
        if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️ Snow";
        if ([95, 96, 99].includes(code)) return "⛈️ Thunderstorm";
        return "Unknown";
    }

    function updateDevWeather(code) {
        const emoji = getWeatherEmoji(code);
        const description = getWeatherDescriptionForCode(code);

        // Update menu button
        const menuEmoji = document.getElementById("menuWeatherEmoji");
        const menuTemp = document.getElementById("menuWeatherTemp");
        if (menuEmoji) menuEmoji.textContent = emoji;
        if (menuTemp) menuTemp.textContent = "DEV";

        // Update overlay
        const overlayEmoji = document.getElementById("overlayWeatherEmoji");
        const overlayDesc = document.getElementById("overlayWeatherDesc");
        if (overlayEmoji) overlayEmoji.textContent = emoji;
        if (overlayDesc) overlayDesc.textContent = description + " (Dev Override)";
    }

    function getWeatherEmoji(code) {
        if (code === 0) return "☀️";
        if ([1, 2].includes(code)) return "🌤️";
        if (code === 3) return "☁️";
        if ([45, 48].includes(code)) return "🌫️";
        if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
        if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
        if ([95, 96, 99].includes(code)) return "⛈️";
        return "❓";
    }

    // Export dev mode time override getter for use in other scripts
    window.getDevTimeOverride = function() {
        return devTimeOverride;
    };

    // Export dev mode day override getter for use in other scripts
    window.getDevDayOverride = function() {
        return devDayOverride;
    };

    // ========================================
    // AUTO-TINT TEXT IN COLORED CONTAINERS
    // ========================================

    function getColorBrightness(color) {
        // Handle hex color format
        if (!color || color === 'transparent') return 128;
        
        let hex = color;
        if (color.startsWith('rgb')) {
            // Convert rgb to hex
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                const r = parseInt(match[0]);
                const g = parseInt(match[1]);
                const b = parseInt(match[2]);
                hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }
        }
        
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
    }

    function applyAutoTintedText() {
        // Apply accent color text with auto-tinting to elements with background colors
        const selectors = [
            '.setting-group',
            '.dev-time-control',
            '.dev-weather-control',
            '.dev-quick-actions',
            '.dev-info-panel',
            '.ui-control-card',
            '.font-group',
            '.ui-controls-grid',
            '.preset-action-btn',
            '.mode-toggle-container'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const bgColor = window.getComputedStyle(el).backgroundColor;
                const brightness = getColorBrightness(bgColor);
                
                // For light backgrounds, use dark text; for dark backgrounds, use light text
                const textColor = brightness > 150 ? '#000000' : '#ffffff';
                
                // Apply to all text children
                const textElements = el.querySelectorAll('h4, h3, h2, p, label, span, button');
                textElements.forEach(textEl => {
                    if (textEl.textContent && textEl.tagName !== 'BUTTON') {
                        textEl.style.color = textColor;
                    }
                });
            });
        });
    }

    // Initialize dev mode
    initDevMode();

    // Apply auto-tinted text on load
    setTimeout(() => {
        applyAutoTintedText();
        // Reapply when accent color changes
        window.applyAutoTintedText = applyAutoTintedText;
    }, 100);

    // Bootstrap
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();

})();