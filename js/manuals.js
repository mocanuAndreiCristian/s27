/* ========================================
   MANUALE: Catalog, Preferinte, Recomandari
   ======================================== */

(function () {
    "use strict";

    const UI_KEY = "customization-ui-settings";
    const CUSTOM_MANUALS_KEY = "custom-library-manuals-v1";
    const RECOMMENDATION_REFRESH_MS = 30000;
    const SEARCH_FALLBACK_URL = "https://manuale.edu.ro/?s=";
    const VALID_MANUAL_TYPES = new Set(["link", "pdf", "app"]);
    const VALID_STORAGE_KINDS = new Set(["url", "upload"]);
    const VALID_OPEN_BEHAVIORS = new Set(["open-all", "buttons", "both"]);
    const DEFAULT_LIBRARY_SETTINGS = {
        libraryPreferredOpenType: "link",
        libraryDesktopColumns: 4,
        libraryRecommendedOpenBehavior: "open-all",
        libraryRecommendedManualMap: {},
        libraryRecommendedMode: "link",
        libraryRecommendedCustomTypes: {},
    };

    let officialManuals = [];
    let customManuals = [];
    let allManualsData = [];
    let currentChoiceState = null;

    function normalizeText(value = "") {
        const stripped = String(value).replace(/<[^>]*>/g, " ");
        const lettersOnly = stripped.replace(/[^\p{L}\p{N}\s]/gu, " ");
        const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
        return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
    }

    function titleCase(value = "") {
        const cleaned = String(value).replace(/\s+/g, " ").trim();
        if (!cleaned) return "General";

        return cleaned
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    function buildSearchUrl(subject = "") {
        return `${SEARCH_FALLBACK_URL}${encodeURIComponent(subject)}`;
    }

    function normalizeManualType(value = "", fallback = "link") {
        return VALID_MANUAL_TYPES.has(value) ? value : fallback;
    }

    function normalizeStorageKind(value = "", fallback = "url") {
        return VALID_STORAGE_KINDS.has(value) ? value : fallback;
    }

    function normalizeOpenBehavior(value = "", fallback = DEFAULT_LIBRARY_SETTINGS.libraryRecommendedOpenBehavior) {
        return VALID_OPEN_BEHAVIORS.has(value) ? value : fallback;
    }

    function clampColumns(value, fallback = 4) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.max(2, Math.min(6, Math.round(parsed)));
    }

    function normalizeManualLink(rawValue = "") {
        const value = String(rawValue).trim();
        if (!value) return "";

        try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) return "";
            return url.toString();
        } catch {
            return "";
        }
    }

    function normalizePdfDataUrl(rawValue = "") {
        const value = String(rawValue).trim();
        if (!value) return "";
        if (!value.startsWith("data:application/pdf")) return "";
        return value.includes(";base64,") ? value : "";
    }

    function clampFileSize(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
    }

    function createId(prefix = "manual") {
        if (window.crypto?.randomUUID) {
            return `${prefix}-${window.crypto.randomUUID()}`;
        }

        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function addSearchMetadata(manual = {}) {
        const title = String(manual.title || "").trim() || "Manual fara titlu";
        const subject = String(manual.subject || "").trim() || title;
        const type = normalizeManualType(manual.type);
        const storageKind = normalizeStorageKind(
            manual.storageKind,
            manual.fileDataUrl ? "upload" : "url",
        );
        const normalizedLink = normalizeManualLink(manual.link);
        const normalizedFileDataUrl = storageKind === "upload" ? normalizePdfDataUrl(manual.fileDataUrl) : "";

        return {
            ...manual,
            title,
            subject,
            displaySubject: titleCase(subject),
            image: normalizeManualLink(manual.image),
            link: normalizedLink,
            type,
            storageKind: normalizedFileDataUrl ? "upload" : storageKind,
            fileDataUrl: normalizedFileDataUrl,
            fileName: normalizedFileDataUrl ? String(manual.fileName || "").trim() : "",
            mimeType: normalizedFileDataUrl ? String(manual.mimeType || "application/pdf").trim() : "",
            sizeBytes: normalizedFileDataUrl ? clampFileSize(manual.sizeBytes) : 0,
            _titleNorm: normalizeText(title),
            _subjectNorm: normalizeText(subject),
        };
    }

    function normalizeOfficialManual(rawManual = {}, index = 0) {
        const title = String(rawManual.title || "").trim();
        const subject = String(rawManual.subject || "").trim();
        const mainImage = rawManual.image;
        const resources = Array.isArray(rawManual.resources) ? rawManual.resources : [];
        
        // If resources array exists, create one manual entry per resource
        if (resources.length > 0) {
            return resources
                .map((resource, resourceIndex) => {
                    const resourceType = String(resource.type || "web").trim().toLowerCase();
                    // Map "web" to "link" for consistency with the manual type system
                    const normalizedType = resourceType === "web" ? "link" : resourceType;
                    const resourceLink = String(resource.link || "").trim();
                    
                    // Skip invalid resources
                    if (!resourceLink || !normalizeManualType(normalizedType)) {
                        return null;
                    }
                    
                    // Append resource type to title if multiple resources
                    let displayTitle = title;
                    if (resources.length > 1) {
                        const typeLabel = normalizedType === "link" ? "Web" 
                                        : normalizedType === "pdf" ? "PDF" 
                                        : "App";
                        displayTitle = `${title} (${typeLabel})`;
                    }
                    
                    // Use resource-specific image if available, otherwise use main image
                    const resourceImage = resource.image || mainImage;
                    
                    return addSearchMetadata({
                        id: `official-${index}-${resourceIndex}`,
                        title: displayTitle,
                        subject: subject,
                        link: resourceLink,
                        image: resourceImage,
                        type: normalizedType,
                        source: "official",
                        storageKind: "url",
                        addedAt: 0,
                    });
                })
                .filter(Boolean);
        }
        
        // Fallback for legacy format (manual with direct link/type)
        return [addSearchMetadata({
            id: `official-${index}`,
            title: title,
            subject: subject,
            link: rawManual.link || "",
            image: mainImage,
            type: normalizeManualType(rawManual.type, "link"),
            source: "official",
            storageKind: "url",
            addedAt: 0,
        })];
    }

    function normalizeCustomManual(rawManual = {}, index = 0) {
        const title = String(rawManual.title || "").trim();
        const subject = String(rawManual.subject || "").trim() || title;
        const inferredStorageKind = rawManual.fileDataUrl ? "upload" : "url";
        const storageKind = normalizeStorageKind(rawManual.storageKind, inferredStorageKind);
        const link = normalizeManualLink(rawManual.link);
        const fileDataUrl = storageKind === "upload" ? normalizePdfDataUrl(rawManual.fileDataUrl) : "";
        const type = normalizeManualType(rawManual.type, fileDataUrl ? "pdf" : "link");

        if (!title || !subject) return null;
        if (!link && !fileDataUrl) return null;

        return addSearchMetadata({
            id: String(rawManual.id || createId(`custom-${index}`)),
            title,
            subject,
            link,
            image: rawManual.image,
            type: fileDataUrl ? "pdf" : type,
            source: "custom",
            storageKind: fileDataUrl ? "upload" : "url",
            fileDataUrl,
            fileName: rawManual.fileName,
            mimeType: rawManual.mimeType,
            sizeBytes: rawManual.sizeBytes,
            addedAt: Number(rawManual.addedAt || Date.now()),
        });
    }

    function serializeCustomManual(manual) {
        return {
            id: manual.id,
            title: manual.title,
            subject: manual.subject,
            link: manual.link || "",
            image: manual.image || "",
            type: manual.type,
            storageKind: manual.storageKind || "url",
            fileDataUrl: manual.fileDataUrl || "",
            fileName: manual.fileName || "",
            mimeType: manual.mimeType || "",
            sizeBytes: manual.sizeBytes || 0,
            addedAt: manual.addedAt || Date.now(),
        };
    }

    function loadCustomManualsFromStorage() {
        try {
            const stored = JSON.parse(localStorage.getItem(CUSTOM_MANUALS_KEY) || "[]");
            customManuals = stored
                .map((manual, index) => normalizeCustomManual(manual, index))
                .filter(Boolean);
        } catch {
            customManuals = [];
        }
    }

    function getSaveErrorMessage(error) {
        if (!error) return "Nu am putut salva manualul acum.";
        const quotaNames = new Set([
            "QuotaExceededError",
            "NS_ERROR_DOM_QUOTA_REACHED",
        ]);

        if (quotaNames.has(error.name)) {
            return "Nu mai este suficient spatiu in localStorage pentru acest PDF. Incearca un fisier mai mic sau sterge manuale salvate.";
        }

        return "Nu am putut salva manualul acum.";
    }

    function saveCustomManualsToStorage() {
        try {
            localStorage.setItem(
                CUSTOM_MANUALS_KEY,
                JSON.stringify(customManuals.map(serializeCustomManual)),
            );
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                error: getSaveErrorMessage(error),
            };
        }
    }

    function sanitizeManualIdList(value) {
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

    function sanitizeLibraryManualMap(value) {
        if (!value || typeof value !== "object") return {};

        return Object.fromEntries(
            Object.entries(value)
                .map(([key, manualIds]) => [normalizeText(key), sanitizeManualIdList(manualIds)])
                .filter(([key, manualIds]) => Boolean(key) && manualIds.length > 0),
        );
    }

    function getLibrarySettings() {
        try {
            const raw = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
            const customTypes = raw.libraryRecommendedCustomTypes && typeof raw.libraryRecommendedCustomTypes === "object"
                ? Object.fromEntries(
                    Object.entries(raw.libraryRecommendedCustomTypes).map(([key, value]) => [
                        normalizeText(key),
                        normalizeManualType(value),
                    ]),
                )
                : {};

            return {
                libraryPreferredOpenType: normalizeManualType(
                    raw.libraryPreferredOpenType,
                    DEFAULT_LIBRARY_SETTINGS.libraryPreferredOpenType,
                ),
                libraryDesktopColumns: clampColumns(
                    raw.libraryDesktopColumns,
                    DEFAULT_LIBRARY_SETTINGS.libraryDesktopColumns,
                ),
                libraryRecommendedOpenBehavior: normalizeOpenBehavior(
                    raw.libraryRecommendedOpenBehavior,
                    DEFAULT_LIBRARY_SETTINGS.libraryRecommendedOpenBehavior,
                ),
                libraryRecommendedManualMap: sanitizeLibraryManualMap(raw.libraryRecommendedManualMap),
                libraryRecommendedMode: raw.libraryRecommendedMode || DEFAULT_LIBRARY_SETTINGS.libraryRecommendedMode,
                libraryRecommendedCustomTypes: customTypes,
            };
        } catch {
            return { ...DEFAULT_LIBRARY_SETTINGS };
        }
    }

    function notifyLibrarySettingsChanged() {
        window.dispatchEvent(
            new CustomEvent("library-settings:updated", {
                detail: { settings: getLibrarySettings() },
            }),
        );
    }

    function updateStoredUiSettings(mutator) {
        try {
            const raw = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
            const next = mutator({ ...raw }) || raw;
            localStorage.setItem(UI_KEY, JSON.stringify(next));
            notifyLibrarySettingsChanged();
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                error: getSaveErrorMessage(error),
            };
        }
    }

    function removeManualFromStoredSettings(manualId = "") {
        if (!manualId) return;

        updateStoredUiSettings((raw) => {
            const manualMap = sanitizeLibraryManualMap(raw.libraryRecommendedManualMap);
            const nextManualMap = {};

            Object.entries(manualMap).forEach(([subjectKey, manualIds]) => {
                const filtered = manualIds.filter((id) => id !== manualId);
                if (filtered.length) {
                    nextManualMap[subjectKey] = filtered;
                }
            });

            return {
                ...raw,
                libraryRecommendedManualMap: nextManualMap,
            };
        });
    }

    function refreshCatalog() {
        allManualsData = [...customManuals, ...officialManuals];
        window.manualsCatalog = allManualsData.slice();
        window.dispatchEvent(
            new CustomEvent("manuals:updated", {
                detail: { manuals: allManualsData.slice() },
            }),
        );
        void updateRecommendedManual();
    }

    async function loadManualsData() {
        const dataPath = window.DATA_PATH || "data/";

        try {
            const response = await fetch(`${dataPath}manuals.json`);
            if (!response.ok) {
                throw new Error("Failed to load manuals.json");
            }

            const data = await response.json();
            officialManuals = Array.isArray(data)
                ? data
                    .map((manual, index) => normalizeOfficialManual(manual, index))
                    .flat()
                    .filter(Boolean)
                : [];
        } catch (error) {
            officialManuals = [];
            console.error("Error loading manuals data:", error);
        } finally {
            refreshCatalog();
        }
    }

    function addCustomManual(input = {}) {
        const manual = normalizeCustomManual(
            {
                id: createId("custom"),
                title: input.title,
                subject: input.subject,
                link: input.link,
                image: input.image,
                type: input.type,
                storageKind: input.storageKind,
                fileDataUrl: input.fileDataUrl,
                fileName: input.fileName,
                mimeType: input.mimeType,
                sizeBytes: input.sizeBytes,
                addedAt: Date.now(),
            },
            customManuals.length,
        );

        if (!manual) {
            return {
                ok: false,
                error: "Completeaza titlul, materia si o sursa valida pentru manual.",
            };
        }

        customManuals.unshift(manual);
        const saveResult = saveCustomManualsToStorage();
        if (!saveResult.ok) {
            customManuals.shift();
            return saveResult;
        }

        refreshCatalog();

        return {
            ok: true,
            manual,
        };
    }

    function removeCustomManual(manualId = "") {
        const targetId = String(manualId);
        const hasManual = customManuals.some((manual) => manual.id === targetId);
        if (!hasManual) {
            return {
                ok: false,
                error: "Manualul personalizat nu mai exista.",
            };
        }

        customManuals = customManuals.filter((manual) => manual.id !== targetId);
        const saveResult = saveCustomManualsToStorage();

        if (!saveResult.ok) {
            loadCustomManualsFromStorage();
            refreshCatalog();
            return saveResult;
        }

        removeManualFromStoredSettings(targetId);
        refreshCatalog();

        return { ok: true };
    }

    function getManualOpenUrl(manual, fallbackUrl = "") {
        if (manual?.storageKind === "upload" && manual.fileDataUrl) {
            return manual.fileDataUrl;
        }

        return manual?.link || fallbackUrl || buildSearchUrl(manual?.subject || manual?.title || "");
    }

    function openManualEntry(manual, fallbackUrl = "") {
        const targetUrl = getManualOpenUrl(
            manual,
            fallbackUrl || buildSearchUrl(manual?.subject || manual?.title || ""),
        );
        if (!targetUrl) return false;
        window.open(targetUrl, "_blank", "noopener");
        return true;
    }

    function openManualEntries(manuals = [], fallbackUrl = "") {
        let openedAny = false;

        manuals.forEach((manual) => {
            if (openManualEntry(manual, fallbackUrl)) {
                openedAny = true;
            }
        });

        return openedAny;
    }

    function getSubjectScore(manual, subjectNorm) {
        const titleTokens = manual._titleNorm.split(" ").filter(Boolean);
        const subjectTokens = subjectNorm.split(" ").filter(Boolean);
        let score = 0;

        titleTokens.forEach((token) => {
            if (subjectTokens.includes(token)) score += 2;
            else if (subjectNorm.includes(token)) score += 1;
        });

        if (manual._titleNorm === subjectNorm || manual._subjectNorm === subjectNorm) score += 5;
        if (subjectNorm.includes(manual._titleNorm) || manual._titleNorm.includes(subjectNorm)) score += 3;
        if (manual._subjectNorm.includes(subjectNorm) || subjectNorm.includes(manual._subjectNorm)) score += 4;

        return score;
    }

    function findBestManualForSubject(subjectText, options = {}) {
        const subjectNorm = normalizeText(subjectText);
        if (!subjectNorm) return null;

        const preferredType = normalizeManualType(
            options.preferredType || getLibrarySettings().libraryPreferredOpenType,
        );

        let best = null;
        let bestScore = 0;

        allManualsData.forEach((manual) => {
            const baseScore = getSubjectScore(manual, subjectNorm);
            if (baseScore <= 0) return;

            let score = baseScore;
            if (manual.type === preferredType) score += 6;
            if (manual.source === "custom") score += 1;

            const isBetter =
                score > bestScore ||
                (score === bestScore && (manual.addedAt || 0) > (best?.addedAt || 0));

            if (isBetter) {
                bestScore = score;
                best = manual;
            }
        });

        return best;
    }

    function findConfiguredSubjectKey(subjectText, manualMap) {
        const subjectNorm = normalizeText(subjectText);
        if (!subjectNorm) return "";
        if (manualMap[subjectNorm]?.length) return subjectNorm;

        let bestKey = "";
        let bestScore = 0;

        Object.keys(manualMap).forEach((candidateKey) => {
            const pseudoManual = {
                _titleNorm: candidateKey,
                _subjectNorm: candidateKey,
            };
            const score = getSubjectScore(pseudoManual, subjectNorm);
            if (score > bestScore) {
                bestScore = score;
                bestKey = candidateKey;
            }
        });

        return bestScore > 0 ? bestKey : "";
    }

    function getConfiguredManualsForSubject(subjectText) {
        const settings = getLibrarySettings();
        const matchedKey = findConfiguredSubjectKey(subjectText, settings.libraryRecommendedManualMap);
        if (!matchedKey) return [];

        const manualIds = settings.libraryRecommendedManualMap[matchedKey] || [];
        return manualIds
            .map((manualId) => allManualsData.find((manual) => manual.id === manualId) || null)
            .filter(Boolean)
            .slice(0, 3);
    }

    function getManualSetForSubject(subjectText) {
        const configured = getConfiguredManualsForSubject(subjectText);
        if (configured.length) {
            return configured;
        }

        const best = findBestManualForSubject(subjectText, { preferredType: getLibrarySettings().libraryPreferredOpenType });
        return best ? [best] : [];
    }

    function getBehaviorLabel(behavior) {
        const labels = {
            "open-all": "Deschide toate",
            buttons: "Butoane separate",
            both: "Ambele",
        };

        return labels[behavior] || labels["open-all"];
    }

    function createManualActionButton(manual, subjectText, options = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `manual-action-btn${options.primary ? " manual-action-btn-primary" : ""}`;

        const visual = document.createElement("span");
        visual.className = "manual-action-visual";

        if (manual.image) {
            const image = document.createElement("img");
            image.src = manual.image;
            image.alt = manual.title;
            image.className = "manual-action-image";
            visual.appendChild(image);
        } else {
            const icon = document.createElement("i");
            icon.className = manual.type === "pdf"
                ? "fa-solid fa-file-pdf manual-action-icon"
                : manual.type === "app"
                    ? "fa-solid fa-mobile-screen-button manual-action-icon"
                    : "fa-solid fa-book manual-action-icon";
            visual.appendChild(icon);
        }

        const textWrap = document.createElement("span");
        textWrap.className = "manual-action-text";

        const title = document.createElement("span");
        title.className = "manual-action-title";
        title.textContent = manual.title;

        const meta = document.createElement("span");
        meta.className = "manual-action-meta";
        meta.textContent = manual.type.toUpperCase();

        textWrap.appendChild(title);
        textWrap.appendChild(meta);
        button.appendChild(visual);
        button.appendChild(textWrap);

        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openManualEntry(manual, buildSearchUrl(subjectText));
            if (options.closeOverlay !== false) {
                window.overlayManager?.close("manualChoiceOverlay");
            }
        });

        return button;
    }

    function createDivider() {
        const divider = document.createElement("span");
        divider.className = "manual-action-divider";
        divider.setAttribute("aria-hidden", "true");
        divider.textContent = "|";
        return divider;
    }

    function createOpenAllButton(subjectText, manuals, options = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `manual-open-all-btn${options.compact ? " manual-open-all-btn-compact" : ""}`;
        button.innerHTML = `<i class="fa-solid fa-layer-group"></i><span>${options.label || "Deschide toate"}</span>`;
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openManualEntries(manuals, buildSearchUrl(subjectText));
            if (options.closeOverlay !== false) {
                window.overlayManager?.close("manualChoiceOverlay");
            }
        });
        return button;
    }

    function populateChoiceOverlay(state) {
        const titleEl = document.getElementById("manualChoiceTitle");
        const descEl = document.getElementById("manualChoiceDescription");
        const actionsEl = document.getElementById("manualChoiceActions");

        if (!actionsEl) return;

        if (titleEl) {
            titleEl.textContent = state.subjectText || "Manuale";
        }

        if (descEl) {
            descEl.textContent = state.includeOpenAll
                ? "Poti deschide toate manualele configurate sau doar unul."
                : "Alege manualul pe care vrei sa il deschizi.";
        }

        actionsEl.innerHTML = "";

        if (state.includeOpenAll) {
            actionsEl.appendChild(
                createOpenAllButton(state.subjectText, state.manuals, {
                    closeOverlay: true,
                    label: "Deschide toate",
                }),
            );
        }

        state.manuals.forEach((manual) => {
            actionsEl.appendChild(
                createManualActionButton(manual, state.subjectText, {
                    primary: false,
                    closeOverlay: true,
                }),
            );
        });
    }

    function showManualChoiceOverlay({ subjectText, manuals, includeOpenAll = false }) {
        if (!manuals.length) return false;

        currentChoiceState = {
            subjectText,
            manuals,
            includeOpenAll,
        };
        populateChoiceOverlay(currentChoiceState);
        window.overlayManager?.open("manualChoiceOverlay");
        return true;
    }

    function renderManualActionGroup(container, subjectText, manuals, behavior, options = {}) {
        if (!container) return;

        const list = document.createElement("div");
        list.className = `manual-action-group${options.mobile ? " manual-action-group-mobile" : ""}`;

        if (manuals.length === 1) {
            list.appendChild(
                createManualActionButton(manuals[0], subjectText, {
                    primary: true,
                    closeOverlay: false,
                }),
            );
            container.appendChild(list);
            return;
        }

        if (behavior === "open-all" || behavior === "both") {
            list.appendChild(
                createOpenAllButton(subjectText, manuals, {
                    compact: options.mobile,
                    closeOverlay: false,
                }),
            );
        }

        if (behavior === "buttons" || behavior === "both") {
            manuals.forEach((manual, index) => {
                if (index > 0 || behavior === "both") {
                    list.appendChild(createDivider());
                }

                list.appendChild(
                    createManualActionButton(manual, subjectText, {
                        primary: false,
                        closeOverlay: false,
                    }),
                );
            });
        } else {
            const summary = document.createElement("button");
            summary.type = "button";
            summary.className = "manual-multi-summary";
            summary.textContent = manuals.map((manual) => manual.title).join(" | ");
            summary.addEventListener("click", () => {
                openManualEntries(manuals, buildSearchUrl(subjectText));
            });
            list.appendChild(createDivider());
            list.appendChild(summary);
        }

        container.appendChild(list);
    }

    function renderDesktopRecommendation(recManualEl, subjectText, manuals, behavior) {
        if (!recManualEl) return;

        recManualEl.innerHTML = "";
        recManualEl.onclick = null;
        recManualEl.style.cursor = "";

        const subject = document.createElement("p");
        subject.className = "recommended-manual-subject";
        subject.textContent = subjectText;
        recManualEl.appendChild(subject);

        renderManualActionGroup(recManualEl, subjectText, manuals, behavior, { mobile: false });
    }

    function renderMobileRecommendation(mobileRecEl, subjectText, manuals, behavior) {
        if (!mobileRecEl) return;

        mobileRecEl.innerHTML = "";
        mobileRecEl.onclick = null;
        mobileRecEl.classList.remove("active");

        if (!manuals.length) return;

        mobileRecEl.classList.add("active");

        const heading = document.createElement("h3");
        heading.textContent = "Manuale pentru acum";

        const subject = document.createElement("p");
        subject.className = "mobile-recommended-subject";
        subject.textContent = subjectText;

        mobileRecEl.appendChild(heading);
        mobileRecEl.appendChild(subject);
        renderManualActionGroup(mobileRecEl, subjectText, manuals, behavior, { mobile: true });
    }

    function hideRecommendations() {
        const recManualEl = document.querySelector("#recommendedManual .manual-card");
        const mobileRecEl = document.getElementById("mobileRecommendedManual");

        if (recManualEl) {
            recManualEl.innerHTML = "<p class=\"recommended-manual-placeholder\">Niciun manual disponibil</p>";
            recManualEl.onclick = null;
            recManualEl.style.cursor = "";
        }

        if (mobileRecEl) {
            mobileRecEl.classList.remove("active");
            mobileRecEl.innerHTML = "";
            mobileRecEl.onclick = null;
        }
    }

    function openManualForSubject(subjectText, fallbackUrl = "") {
        const manuals = getManualSetForSubject(subjectText);
        const resolvedFallback = fallbackUrl || buildSearchUrl(subjectText);
        const behavior = getLibrarySettings().libraryRecommendedOpenBehavior;

        if (!manuals.length) {
            return openManualEntry(null, resolvedFallback);
        }

        if (manuals.length === 1 || behavior === "open-all") {
            return manuals.length === 1
                ? openManualEntry(manuals[0], resolvedFallback)
                : openManualEntries(manuals, resolvedFallback);
        }

        return showManualChoiceOverlay({
            subjectText,
            manuals,
            includeOpenAll: behavior === "both",
        });
    }

    function parseTimeCellToDate(timeStr, referenceDate) {
        const [hours, minutes] = String(timeStr).split(":").map(Number);
        const date = new Date(referenceDate);
        date.setHours(hours, minutes || 0, 0, 0);
        return date;
    }

    async function updateRecommendedManual() {
        const devOverride = window.getDevTimeOverride?.();
        const devDayOverride = window.getDevDayOverride?.();
        const now = devOverride || new Date();
        const day = devDayOverride !== null ? devDayOverride : now.getDay();
        const recManualEl = document.querySelector("#recommendedManual .manual-card");
        const mobileRecEl = document.getElementById("mobileRecommendedManual");

        if (day === 0 || day === 6) {
            hideRecommendations();
            return;
        }

        let schedule = [];
        if (window.timetableData?.schedule) {
            schedule = window.timetableData.schedule;
        } else {
            const dataPath = window.DATA_PATH || "data/";
            const classId = window.CLASS_ID || "8d";

            try {
                const response = await fetch(`${dataPath}${classId}.json`);
                if (!response.ok) throw new Error("Failed to fetch class schedule.");
                const data = await response.json();
                schedule = data.schedule || [];
            } catch {
                hideRecommendations();
                return;
            }
        }

        const dayKeys = [null, "monday", "tuesday", "wednesday", "thursday", "friday"];
        const currentDayKey = dayKeys[day];

        let matchedSubject = "";
        schedule.some((row) => {
            const classStart = parseTimeCellToDate(row.time, now);
            const windowStart = new Date(classStart.getTime() - 10 * 60 * 1000);
            const windowEnd = new Date(classStart.getTime() + 50 * 60 * 1000);

            if (now >= windowStart && now < windowEnd) {
                const subject = row[currentDayKey];
                if (subject) {
                    matchedSubject = subject.name;
                    return true;
                }
            }

            return false;
        });

        if (!matchedSubject) {
            hideRecommendations();
            return;
        }

        const manuals = getManualSetForSubject(matchedSubject);
        if (!manuals.length) {
            hideRecommendations();
            return;
        }

        const behavior = manuals.length > 1
            ? getLibrarySettings().libraryRecommendedOpenBehavior
            : "buttons";

        renderDesktopRecommendation(recManualEl, matchedSubject.trim(), manuals, behavior);
        renderMobileRecommendation(mobileRecEl, matchedSubject.trim(), manuals, behavior);
    }

    function closeChoiceOverlay() {
        currentChoiceState = null;
        window.overlayManager?.close("manualChoiceOverlay");
    }

    function initChoiceOverlay() {
        if (window.overlayManager) {
            window.overlayManager.register("manualChoiceOverlay");
        }

        document.getElementById("closeManualChoiceOverlay")?.addEventListener("click", closeChoiceOverlay);

        document.getElementById("manualChoiceOverlay")?.addEventListener("click", (event) => {
            if (event.target === event.currentTarget) {
                closeChoiceOverlay();
            }
        });
    }

    function init() {
        loadCustomManualsFromStorage();
        refreshCatalog();
        void loadManualsData();
        initChoiceOverlay();
        window.setInterval(updateRecommendedManual, RECOMMENDATION_REFRESH_MS);
        window.addEventListener("library-settings:updated", () => {
            void updateRecommendedManual();
        });
    }

    window.getManualsCatalog = () => allManualsData.slice();
    window.findBestManualForSubject = findBestManualForSubject;
    window.getConfiguredManualsForSubject = getConfiguredManualsForSubject;
    window.getManualSetForSubject = getManualSetForSubject;
    window.updateRecommendedManual = updateRecommendedManual;
    window.openManualForSubject = openManualForSubject;
    window.openManualEntry = openManualEntry;
    window.openManualEntries = openManualEntries;
    window.addCustomManual = addCustomManual;
    window.removeCustomManual = removeCustomManual;
    window.getLibrarySettings = getLibrarySettings;
    window.notifyLibrarySettingsChanged = notifyLibrarySettingsChanged;
    window.getLibraryOpenBehaviorLabel = getBehaviorLabel;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
