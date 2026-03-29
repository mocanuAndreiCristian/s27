/* ========================================
   MANUALS: Library, Search, Saved Manuals
   ======================================== */

(function () {
    "use strict";

    const CUSTOM_MANUALS_KEY = "custom-manuals-v2";
    const PDF_DB_NAME = "orar-manuals-db";
    const PDF_STORE_NAME = "manual-pdfs";
    const RECOMMENDATION_REFRESH_MS = 30000;
    const MANUAL_SKELETON_CARDS = 6;
    const SEARCH_FALLBACK_URL = "https://manuale.edu.ro/?s=";

    const dom = {};
    const filterState = {
        query: "",
        subject: "all",
        source: "all",
        sort: "best",
    };

    let officialManuals = [];
    let customManuals = [];
    let allManualsData = [];
    let isLibraryLoading = true;
    let libraryNotice = "";
    let activeManualType = "link";
    let manualDbPromise = null;

    function cacheDom() {
        dom.allManualsBtn = document.getElementById("allManualsBtn");
        dom.manualsOverlay = document.getElementById("manualsOverlay");
        dom.closeManualsOverlay = document.getElementById("closeManualsOverlay");
        dom.manualSearchInput = document.getElementById("manualSearchInput");
        dom.manualSubjectFilter = document.getElementById("manualSubjectFilter");
        dom.manualSortSelect = document.getElementById("manualSortSelect");
        dom.manualSourceFilters = document.getElementById("manualSourceFilters");
        dom.manualTypeSwitch = document.getElementById("manualTypeSwitch");
        dom.manualTitleInput = document.getElementById("manualTitleInput");
        dom.manualSubjectInput = document.getElementById("manualSubjectInput");
        dom.manualLinkField = document.getElementById("manualLinkField");
        dom.manualLinkInput = document.getElementById("manualLinkInput");
        dom.manualPdfField = document.getElementById("manualPdfField");
        dom.manualPdfInput = document.getElementById("manualPdfInput");
        dom.manualPdfName = document.getElementById("manualPdfName");
        dom.saveManualBtn = document.getElementById("saveManualBtn");
        dom.resetManualFormBtn = document.getElementById("resetManualFormBtn");
        dom.manualFormStatus = document.getElementById("manualFormStatus");
        dom.manualsGrid = document.getElementById("manualsGrid");
        dom.manualsNotice = document.getElementById("manualsNotice");
        dom.clearManualFilters = document.getElementById("clearManualFilters");
        dom.manualResultsSummary = document.getElementById("manualResultsSummary");
        dom.manualStatVisible = document.getElementById("manualStatVisible");
        dom.manualStatOfficial = document.getElementById("manualStatOfficial");
        dom.manualStatCustom = document.getElementById("manualStatCustom");
        dom.manualStatPdf = document.getElementById("manualStatPdf");
    }

    function normalizeText(value = "") {
        const stripped = String(value).replace(/<[^>]*>/g, " ");
        const lettersOnly = stripped.replace(/[^\p{L}\p{N}\s]/gu, " ");
        const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
        return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
    }

    function escapeHtml(value = "") {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function titleCase(value = "") {
        const cleaned = String(value).replace(/\s+/g, " ").trim();
        if (!cleaned) return "General";

        return cleaned
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    function getInitials(value = "") {
        const words = String(value)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2);

        if (!words.length) return "M";
        return words.map((word) => word.charAt(0).toUpperCase()).join("");
    }

    function createId(prefix = "manual") {
        if (window.crypto?.randomUUID) {
            return `${prefix}-${window.crypto.randomUUID()}`;
        }

        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function isPdfLink(url = "") {
        return /\.pdf(?:$|[?#])/i.test(url);
    }

    function buildSearchUrl(subject = "") {
        return `${SEARCH_FALLBACK_URL}${encodeURIComponent(subject)}`;
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

    function addSearchMetadata(manual) {
        const title = manual.title || "Untitled Manual";
        const subject = manual.subject || title;

        return {
            ...manual,
            title,
            subject,
            displaySubject: titleCase(subject),
            _titleNorm: normalizeText(title),
            _subjectNorm: normalizeText(subject),
            _searchNorm: normalizeText(`${title} ${subject}`),
        };
    }

    function normalizeOfficialManual(rawManual = {}, index = 0) {
        const title = String(rawManual.title || "").trim() || `Manual ${index + 1}`;
        const subject = String(rawManual.subject || "").trim() || title;
        const link = normalizeManualLink(rawManual.link) || buildSearchUrl(subject);

        return addSearchMetadata({
            id: `official-${index}`,
            title,
            subject,
            link,
            image: String(rawManual.image || "").trim(),
            source: "official",
            type: isPdfLink(link) ? "pdf" : "link",
            addedAt: 0,
            fileName: "",
            pdfKey: "",
        });
    }

    function normalizeCustomManual(rawManual = {}, index = 0) {
        const title = String(rawManual.title || "").trim();
        const subject = String(rawManual.subject || "").trim() || title;
        const type = rawManual.type === "pdf" ? "pdf" : "link";
        const link = type === "link" ? normalizeManualLink(rawManual.link) : "";
        const pdfKey = type === "pdf" ? String(rawManual.pdfKey || "").trim() : "";

        if (!title || !subject) return null;
        if (type === "link" && !link) return null;
        if (type === "pdf" && !pdfKey) return null;

        return addSearchMetadata({
            id: String(rawManual.id || createId(`custom-${index}`)),
            title,
            subject,
            link,
            image: "",
            source: "custom",
            type,
            addedAt: Number(rawManual.addedAt || Date.now()),
            fileName: String(rawManual.fileName || "").trim(),
            pdfKey,
        });
    }

    function serializeCustomManual(manual) {
        return {
            id: manual.id,
            title: manual.title,
            subject: manual.subject,
            type: manual.type,
            link: manual.link || "",
            addedAt: manual.addedAt || Date.now(),
            fileName: manual.fileName || "",
            pdfKey: manual.pdfKey || "",
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

    function saveCustomManualsToStorage() {
        localStorage.setItem(
            CUSTOM_MANUALS_KEY,
            JSON.stringify(customManuals.map(serializeCustomManual)),
        );
    }

    function applyRandomSkeletonDelay(root) {
        if (!root) return;

        root.querySelectorAll(".skeleton-loading").forEach((element) => {
            const delay = 0.43 + Math.random() * (0.71 - 0.43);
            element.style.animationDelay = `${delay.toFixed(3)}s`;
        });
    }

    function openManualDb() {
        if (manualDbPromise) return manualDbPromise;

        manualDbPromise = new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB is not supported in this browser."));
                return;
            }

            const request = indexedDB.open(PDF_DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
                    db.createObjectStore(PDF_STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Failed to open manuals database."));
        });

        return manualDbPromise;
    }

    async function withPdfStore(mode, action) {
        const db = await openManualDb();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(PDF_STORE_NAME, mode);
            const store = transaction.objectStore(PDF_STORE_NAME);

            action(store, resolve, reject);

            transaction.onerror = () => reject(transaction.error || new Error("PDF storage failed."));
        });
    }

    async function storePdfBlob(key, blob) {
        return withPdfStore("readwrite", (store, resolve, reject) => {
            const request = store.put(blob, key);
            request.onsuccess = () => resolve(key);
            request.onerror = () => reject(request.error || new Error("Could not save the PDF."));
        });
    }

    async function readPdfBlob(key) {
        return withPdfStore("readonly", (store, resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error("Could not read the PDF."));
        });
    }

    async function deletePdfBlob(key) {
        if (!key) return;

        return withPdfStore("readwrite", (store, resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error("Could not delete the PDF."));
        });
    }

    function setFormStatus(message = "", tone = "neutral") {
        if (!dom.manualFormStatus) return;

        dom.manualFormStatus.textContent = message;
        dom.manualFormStatus.dataset.tone = tone;
        dom.manualFormStatus.hidden = !message;
    }

    function setLibraryNotice(message = "") {
        if (!dom.manualsNotice) return;

        dom.manualsNotice.hidden = !message;
        dom.manualsNotice.textContent = message;
    }

    function getActiveNotice() {
        if (libraryNotice) return libraryNotice;
        if (isLibraryLoading) return "Loading official manuals...";
        return "";
    }

    function syncManualTypeUI() {
        if (dom.manualTypeSwitch) {
            dom.manualTypeSwitch.querySelectorAll("[data-manual-type]").forEach((button) => {
                button.classList.toggle(
                    "active",
                    button.getAttribute("data-manual-type") === activeManualType,
                );
            });
        }

        if (dom.manualLinkField) {
            dom.manualLinkField.hidden = activeManualType !== "link";
        }

        if (dom.manualPdfField) {
            dom.manualPdfField.hidden = activeManualType !== "pdf";
        }
    }

    function resetManualForm() {
        if (dom.manualTitleInput) dom.manualTitleInput.value = "";
        if (dom.manualSubjectInput) dom.manualSubjectInput.value = "";
        if (dom.manualLinkInput) dom.manualLinkInput.value = "";
        if (dom.manualPdfInput) dom.manualPdfInput.value = "";
        if (dom.manualPdfName) dom.manualPdfName.textContent = "No file selected";
        setFormStatus("");
    }

    function hydrateManualsCatalog() {
        allManualsData = [...customManuals, ...officialManuals];
        window.manualsCatalog = allManualsData.slice();

        populateSubjectFilter();
        renderManualsLibrary();
        window.dispatchEvent(
            new CustomEvent("manuals:updated", {
                detail: { manuals: allManualsData.slice() },
            }),
        );

        void updateRecommendedManual();
    }

    async function loadManualsData() {
        const dataPath = window.DATA_PATH || "data/";
        isLibraryLoading = true;
        libraryNotice = "";
        renderManualsLibrary();

        try {
            const response = await fetch(`${dataPath}manuals.json`);
            if (!response.ok) {
                throw new Error("Failed to load manuals.json");
            }

            const data = await response.json();
            officialManuals = data.map((manual, index) => normalizeOfficialManual(manual, index));
        } catch (error) {
            officialManuals = [];
            libraryNotice = "Official manuals could not be loaded right now. Your saved manuals are still available.";
            console.error("Error loading manuals data:", error);
        } finally {
            isLibraryLoading = false;
            hydrateManualsCatalog();
        }
    }

    function populateSubjectFilter() {
        if (!dom.manualSubjectFilter) return;

        const subjects = [];
        const seen = new Set();

        allManualsData.forEach((manual) => {
            if (!manual._subjectNorm || seen.has(manual._subjectNorm)) return;
            seen.add(manual._subjectNorm);
            subjects.push({
                value: manual._subjectNorm,
                label: manual.displaySubject,
            });
        });

        subjects.sort((left, right) => left.label.localeCompare(right.label));

        const currentValue = filterState.subject;
        dom.manualSubjectFilter.innerHTML = '<option value="all">All subjects</option>';

        subjects.forEach((subject) => {
            const option = document.createElement("option");
            option.value = subject.value;
            option.textContent = subject.label;
            dom.manualSubjectFilter.appendChild(option);
        });

        if (currentValue !== "all" && subjects.some((subject) => subject.value === currentValue)) {
            dom.manualSubjectFilter.value = currentValue;
        } else {
            filterState.subject = "all";
            dom.manualSubjectFilter.value = "all";
        }
    }

    function getMatchScore(manual, queryNorm) {
        if (!queryNorm) return 0;

        const tokens = queryNorm.split(" ").filter(Boolean);
        let score = 0;

        if (manual._subjectNorm === queryNorm) score += 12;
        if (manual._titleNorm === queryNorm) score += 10;
        if (manual._subjectNorm.includes(queryNorm)) score += 7;
        if (manual._titleNorm.includes(queryNorm)) score += 6;
        if (manual._searchNorm.includes(queryNorm)) score += 4;

        tokens.forEach((token) => {
            if (token.length < 2) return;
            if (manual._subjectNorm.includes(token)) score += 3;
            if (manual._titleNorm.includes(token)) score += 2;
        });

        return score;
    }

    function filterBySource(manual, source) {
        if (source === "all") return true;
        if (source === "official") return manual.source === "official";
        if (source === "custom") return manual.source === "custom";
        if (source === "pdf") return manual.type === "pdf";
        if (source === "link") return manual.type === "link";
        return true;
    }

    function getVisibleManuals() {
        const queryNorm = normalizeText(filterState.query);

        const visible = allManualsData
            .map((manual) => ({
                manual,
                score: getMatchScore(manual, queryNorm),
            }))
            .filter(({ manual, score }) => {
                if (filterState.subject !== "all" && manual._subjectNorm !== filterState.subject) {
                    return false;
                }

                if (!filterBySource(manual, filterState.source)) {
                    return false;
                }

                if (queryNorm && score <= 0) {
                    return false;
                }

                return true;
            });

        visible.sort((left, right) => {
            switch (filterState.sort) {
                case "title-asc":
                    return left.manual.title.localeCompare(right.manual.title);
                case "title-desc":
                    return right.manual.title.localeCompare(left.manual.title);
                case "subject-asc":
                    return left.manual.displaySubject.localeCompare(right.manual.displaySubject)
                        || left.manual.title.localeCompare(right.manual.title);
                case "newest":
                    return (right.manual.addedAt || 0) - (left.manual.addedAt || 0)
                        || left.manual.title.localeCompare(right.manual.title);
                case "best":
                default:
                    if (queryNorm) {
                        return right.score - left.score
                            || (right.manual.addedAt || 0) - (left.manual.addedAt || 0)
                            || left.manual.title.localeCompare(right.manual.title);
                    }

                    return (right.manual.addedAt || 0) - (left.manual.addedAt || 0)
                        || (left.manual.source === right.manual.source
                            ? 0
                            : left.manual.source === "custom"
                                ? -1
                                : 1)
                        || left.manual.title.localeCompare(right.manual.title);
            }
        });

        return visible.map((item) => item.manual);
    }

    function hasActiveFilters() {
        return Boolean(filterState.query || filterState.subject !== "all" || filterState.source !== "all");
    }

    function formatManualMeta(manual) {
        if (manual.source === "official") {
            return manual.type === "pdf" ? "Official PDF" : "Official library";
        }

        if (manual.type === "pdf") {
            return manual.fileName || "Saved PDF";
        }

        if (!manual.addedAt) return "Saved manual";
        return `Saved ${new Date(manual.addedAt).toLocaleDateString()}`;
    }

    function createManualCover(manual) {
        if (manual.image) {
            return `
                <div class="manual-card-cover has-image">
                    <img src="${escapeHtml(manual.image)}" alt="${escapeHtml(manual.title)} cover" loading="lazy">
                </div>
            `;
        }

        const iconClass = manual.type === "pdf" ? "fa-solid fa-file-pdf" : "fa-solid fa-link";
        const initials = getInitials(manual.displaySubject);

        return `
            <div class="manual-card-cover">
                <div class="manual-cover-fallback">
                    <i class="${iconClass}"></i>
                    <span>${escapeHtml(initials)}</span>
                </div>
            </div>
        `;
    }

    function createManualCard(manual) {
        const article = document.createElement("article");
        article.className = `manuals-library-card source-${manual.source} type-${manual.type}`;
        article.dataset.manualId = manual.id;
        article.tabIndex = 0;
        article.setAttribute("role", "button");
        article.setAttribute("aria-label", `Open ${manual.title}`);

        article.innerHTML = `
            ${manual.source === "custom"
                ? `<button type="button" class="manual-delete-btn" data-delete-manual="${escapeHtml(manual.id)}" aria-label="Delete ${escapeHtml(manual.title)}">
                        <i class="fa-solid fa-trash"></i>
                   </button>`
                : ""}
            ${createManualCover(manual)}
            <div class="manual-card-content">
                <div class="manual-card-pills">
                    <span class="manual-card-pill ${manual.source}">${manual.source === "custom" ? "Personal" : "Official"}</span>
                    <span class="manual-card-pill ${manual.type}">${manual.type === "pdf" ? "PDF" : "Link"}</span>
                </div>
                <h4>${escapeHtml(manual.title)}</h4>
                <p class="manual-card-subject">${escapeHtml(manual.displaySubject)}</p>
                <p class="manual-card-meta">${escapeHtml(formatManualMeta(manual))}</p>
                <button type="button" class="manual-open-btn" data-open-manual="${escapeHtml(manual.id)}">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>Open Manual</span>
                </button>
            </div>
        `;

        return article;
    }

    function renderManualSkeletons() {
        if (!dom.manualsGrid) return;

        dom.manualsGrid.innerHTML = "";

        for (let index = 0; index < MANUAL_SKELETON_CARDS; index += 1) {
            const card = document.createElement("article");
            card.className = "manuals-library-card is-skeleton";
            card.setAttribute("aria-hidden", "true");
            card.innerHTML = `
                <div class="manual-card-cover">
                    <div class="manual-cover-fallback skeleton-loading"></div>
                </div>
                <div class="manual-card-content">
                    <div class="manual-card-pills">
                        <span class="manual-card-pill skeleton-loading"></span>
                        <span class="manual-card-pill skeleton-loading"></span>
                    </div>
                    <div class="manual-card-line skeleton-loading"></div>
                    <div class="manual-card-line short skeleton-loading"></div>
                    <div class="manual-card-line tiny skeleton-loading"></div>
                    <div class="manual-open-btn skeleton-loading"></div>
                </div>
            `;
            dom.manualsGrid.appendChild(card);
        }

        applyRandomSkeletonDelay(dom.manualsGrid);
    }

    function renderEmptyLibrary(message) {
        if (!dom.manualsGrid) return;

        dom.manualsGrid.innerHTML = `
            <div class="manuals-empty-state">
                <i class="fa-solid fa-book-bookmark"></i>
                <h4>No manuals found</h4>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    function updateLibraryStats(visibleManuals) {
        if (dom.manualStatVisible) {
            dom.manualStatVisible.textContent = String(visibleManuals.length);
        }
        if (dom.manualStatOfficial) {
            dom.manualStatOfficial.textContent = String(
                allManualsData.filter((manual) => manual.source === "official").length,
            );
        }
        if (dom.manualStatCustom) {
            dom.manualStatCustom.textContent = String(
                allManualsData.filter((manual) => manual.source === "custom").length,
            );
        }
        if (dom.manualStatPdf) {
            dom.manualStatPdf.textContent = String(
                allManualsData.filter((manual) => manual.type === "pdf").length,
            );
        }
    }

    function updateResultsSummary(visibleManuals) {
        if (!dom.manualResultsSummary) return;

        if (isLibraryLoading && !allManualsData.length) {
            dom.manualResultsSummary.textContent = "Loading manuals...";
            return;
        }

        if (!allManualsData.length) {
            dom.manualResultsSummary.textContent = "No manuals available yet.";
            return;
        }

        if (filterState.query) {
            dom.manualResultsSummary.textContent = `Showing ${visibleManuals.length} result${visibleManuals.length === 1 ? "" : "s"} for "${filterState.query}"`;
            return;
        }

        dom.manualResultsSummary.textContent = `Showing ${visibleManuals.length} of ${allManualsData.length} manuals`;
    }

    function renderManualsLibrary() {
        if (!dom.manualsGrid) return;

        const visibleManuals = getVisibleManuals();
        setLibraryNotice(getActiveNotice());
        updateLibraryStats(visibleManuals);
        updateResultsSummary(visibleManuals);

        if (dom.clearManualFilters) {
            dom.clearManualFilters.hidden = !hasActiveFilters();
        }

        if (isLibraryLoading && !allManualsData.length) {
            renderManualSkeletons();
            return;
        }

        if (!visibleManuals.length) {
            renderEmptyLibrary(
                hasActiveFilters()
                    ? "Try a different search, subject, or source filter."
                    : "Add your first manual or wait for the official library to load.",
            );
            return;
        }

        dom.manualsGrid.innerHTML = "";
        visibleManuals.forEach((manual) => {
            dom.manualsGrid.appendChild(createManualCard(manual));
        });
    }

    function findManualById(manualId) {
        return allManualsData.find((manual) => manual.id === manualId) || null;
    }

    function findCustomManualById(manualId) {
        return customManuals.find((manual) => manual.id === manualId) || null;
    }

    async function openStoredPdf(pdfKey, fallbackUrl = "") {
        const popup = window.open("", "_blank");

        try {
            const blob = await readPdfBlob(pdfKey);
            if (!blob) throw new Error("Stored PDF missing.");

            const objectUrl = URL.createObjectURL(blob);
            if (popup && !popup.closed) {
                popup.location.href = objectUrl;
            } else {
                window.open(objectUrl, "_blank", "noopener");
            }

            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            return true;
        } catch (error) {
            console.error("Could not open stored PDF:", error);

            if (popup && !popup.closed) {
                popup.close();
            }

            if (fallbackUrl) {
                window.open(fallbackUrl, "_blank", "noopener");
                return true;
            }

            setLibraryNotice("That saved PDF is no longer available. Try uploading it again.");
            return false;
        }
    }

    async function openManualEntry(manual, fallbackUrl = "") {
        if (!manual) {
            if (fallbackUrl) {
                window.open(fallbackUrl, "_blank", "noopener");
            }
            return false;
        }

        if (manual.type === "pdf" && manual.source === "custom" && manual.pdfKey) {
            return openStoredPdf(manual.pdfKey, fallbackUrl || buildSearchUrl(manual.subject));
        }

        const targetUrl = manual.link || fallbackUrl || buildSearchUrl(manual.subject || manual.title);
        window.open(targetUrl, "_blank", "noopener");
        return true;
    }

    function findBestManualForSubject(subjectText) {
        const subjectNorm = normalizeText(subjectText);
        let best = null;
        let bestScore = 0;

        allManualsData.forEach((manual) => {
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

            if (score > bestScore) {
                bestScore = score;
                best = manual;
            }
        });

        return best;
    }

    async function openManualForSubject(subjectText, fallbackUrl = "") {
        const manual = findBestManualForSubject(subjectText);
        const resolvedFallback = fallbackUrl || buildSearchUrl(subjectText);
        return openManualEntry(manual, resolvedFallback);
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

        const hideAll = () => {
            if (recManualEl) {
                recManualEl.innerHTML = "<p>No textbook available</p>";
                recManualEl.style.cursor = "";
                recManualEl.onclick = null;
            }

            if (mobileRecEl) {
                mobileRecEl.classList.remove("active");
                mobileRecEl.innerHTML = "";
                mobileRecEl.onclick = null;
            }
        };

        if (day === 0 || day === 6) {
            hideAll();
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
                hideAll();
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
            hideAll();
            return;
        }

        const best = findBestManualForSubject(matchedSubject);

        if (recManualEl) {
            recManualEl.innerHTML = "";
            recManualEl.onclick = null;
            recManualEl.style.cursor = "";

            if (!best) {
                const paragraph = document.createElement("p");
                paragraph.textContent = matchedSubject.trim() || "No textbook available";
                recManualEl.appendChild(paragraph);
            } else {
                if (best.image) {
                    const image = document.createElement("img");
                    image.src = best.image;
                    image.alt = best.title;
                    image.style.width = "100%";
                    image.style.borderRadius = "var(--border-radius-sm)";
                    recManualEl.appendChild(image);
                }

                const paragraph = document.createElement("p");
                paragraph.textContent = best.title;
                recManualEl.appendChild(paragraph);

                recManualEl.style.cursor = "pointer";
                recManualEl.onclick = () => {
                    void openManualEntry(best, buildSearchUrl(matchedSubject));
                };
            }
        }

        if (mobileRecEl) {
            mobileRecEl.innerHTML = "";
            mobileRecEl.onclick = null;
            mobileRecEl.classList.remove("active");

            if (best) {
                mobileRecEl.classList.add("active");

                const heading = document.createElement("h3");
                heading.textContent = "Current Textbook";

                const paragraph = document.createElement("p");
                paragraph.textContent = best.title;

                mobileRecEl.appendChild(heading);
                mobileRecEl.appendChild(paragraph);
                mobileRecEl.onclick = () => {
                    void openManualEntry(best, buildSearchUrl(matchedSubject));
                };
            }
        }
    }

    async function handleSaveManual() {
        const title = String(dom.manualTitleInput?.value || "").trim();
        const subject = String(dom.manualSubjectInput?.value || "").trim() || title;

        if (!title) {
            setFormStatus("Add a title before saving.", "error");
            dom.manualTitleInput?.focus();
            return;
        }

        if (!subject) {
            setFormStatus("Add a subject so the manual can be filtered and matched.", "error");
            dom.manualSubjectInput?.focus();
            return;
        }

        try {
            let manual = null;

            if (activeManualType === "link") {
                const link = normalizeManualLink(dom.manualLinkInput?.value || "");
                if (!link) {
                    setFormStatus("Paste a valid http or https link.", "error");
                    dom.manualLinkInput?.focus();
                    return;
                }

                manual = addSearchMetadata({
                    id: createId("custom-link"),
                    title,
                    subject,
                    link,
                    image: "",
                    source: "custom",
                    type: isPdfLink(link) ? "pdf" : "link",
                    addedAt: Date.now(),
                    fileName: "",
                    pdfKey: "",
                });
            } else {
                const file = dom.manualPdfInput?.files?.[0];
                if (!file) {
                    setFormStatus("Choose a PDF file first.", "error");
                    return;
                }

                const pdfKey = createId("custom-pdf");
                await storePdfBlob(pdfKey, file);

                manual = addSearchMetadata({
                    id: createId("custom"),
                    title,
                    subject,
                    link: "",
                    image: "",
                    source: "custom",
                    type: "pdf",
                    addedAt: Date.now(),
                    fileName: file.name,
                    pdfKey,
                });
            }

            customManuals.unshift(manual);
            saveCustomManualsToStorage();
            hydrateManualsCatalog();
            resetManualForm();
            setFormStatus("Manual saved on this device.", "success");
        } catch (error) {
            console.error("Could not save manual:", error);
            setFormStatus("Could not save that manual on this device.", "error");
        }
    }

    async function handleDeleteManual(manualId) {
        const manual = findCustomManualById(manualId);
        if (!manual) return;

        const confirmed = window.confirm(`Delete "${manual.title}" from your saved manuals?`);
        if (!confirmed) return;

        try {
            if (manual.type === "pdf" && manual.pdfKey) {
                await deletePdfBlob(manual.pdfKey);
            }

            customManuals = customManuals.filter((item) => item.id !== manualId);
            saveCustomManualsToStorage();
            hydrateManualsCatalog();
            setFormStatus("Manual deleted.", "success");
        } catch (error) {
            console.error("Could not delete manual:", error);
            setFormStatus("Could not delete that manual right now.", "error");
        }
    }

    function openManualsOverlay() {
        if (!dom.manualsOverlay) return;

        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            window.overlayManager.open("manualsOverlay");
        } else {
            dom.manualsOverlay.classList.add("active");
        }

        renderManualsLibrary();
        window.requestAnimationFrame(() => dom.manualSearchInput?.focus());
    }

    function closeManualsOverlay() {
        if (!dom.manualsOverlay) return;

        if (window.overlayManager) {
            window.overlayManager.close("manualsOverlay");
        } else {
            dom.manualsOverlay.classList.remove("active");
        }
    }

    function handleGridKeydown(event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target.closest("button, input, select, textarea")) return;

        const card = event.target.closest(".manuals-library-card");
        if (!card) return;

        if (event.target.closest(".manual-delete-btn")) return;

        event.preventDefault();
        const manual = findManualById(card.dataset.manualId || "");
        if (manual) {
            void openManualEntry(manual, buildSearchUrl(manual.subject));
        }
    }

    function bindEvents() {
        dom.allManualsBtn?.addEventListener("click", openManualsOverlay);
        dom.closeManualsOverlay?.addEventListener("click", closeManualsOverlay);

        dom.manualSearchInput?.addEventListener("input", (event) => {
            filterState.query = event.target.value;
            renderManualsLibrary();
        });

        dom.manualSubjectFilter?.addEventListener("change", (event) => {
            filterState.subject = event.target.value;
            renderManualsLibrary();
        });

        dom.manualSortSelect?.addEventListener("change", (event) => {
            filterState.sort = event.target.value;
            renderManualsLibrary();
        });

        dom.manualSourceFilters?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-source-filter]");
            if (!button) return;

            filterState.source = button.getAttribute("data-source-filter") || "all";

            dom.manualSourceFilters.querySelectorAll("[data-source-filter]").forEach((chip) => {
                chip.classList.toggle(
                    "active",
                    chip.getAttribute("data-source-filter") === filterState.source,
                );
            });

            renderManualsLibrary();
        });

        dom.clearManualFilters?.addEventListener("click", () => {
            filterState.query = "";
            filterState.subject = "all";
            filterState.source = "all";

            if (dom.manualSearchInput) dom.manualSearchInput.value = "";
            if (dom.manualSubjectFilter) dom.manualSubjectFilter.value = "all";
            if (dom.manualSourceFilters) {
                dom.manualSourceFilters.querySelectorAll("[data-source-filter]").forEach((chip) => {
                    chip.classList.toggle(
                        "active",
                        chip.getAttribute("data-source-filter") === "all",
                    );
                });
            }

            renderManualsLibrary();
        });

        dom.manualTypeSwitch?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-manual-type]");
            if (!button) return;

            activeManualType = button.getAttribute("data-manual-type") || "link";
            syncManualTypeUI();
            setFormStatus("");
        });

        dom.manualPdfInput?.addEventListener("change", () => {
            const file = dom.manualPdfInput.files?.[0];
            if (dom.manualPdfName) {
                dom.manualPdfName.textContent = file ? file.name : "No file selected";
            }
        });

        dom.saveManualBtn?.addEventListener("click", () => {
            void handleSaveManual();
        });

        dom.resetManualFormBtn?.addEventListener("click", () => {
            resetManualForm();
        });

        dom.manualsGrid?.addEventListener("click", (event) => {
            const deleteButton = event.target.closest("[data-delete-manual]");
            if (deleteButton) {
                event.stopPropagation();
                void handleDeleteManual(deleteButton.getAttribute("data-delete-manual") || "");
                return;
            }

            const card = event.target.closest(".manuals-library-card");
            if (!card) return;

            const manual = findManualById(card.dataset.manualId || "");
            if (manual) {
                void openManualEntry(manual, buildSearchUrl(manual.subject));
            }
        });

        dom.manualsGrid?.addEventListener("keydown", handleGridKeydown);
    }

    function registerOverlay() {
        if (!window.overlayManager || !dom.manualsOverlay) return;

        window.overlayManager.register("manualsOverlay", {
            closeOnBackdrop: true,
            onOpen: () => {
                renderManualsLibrary();
                window.requestAnimationFrame(() => dom.manualSearchInput?.focus());
            },
        });
    }

    function init() {
        cacheDom();
        loadCustomManualsFromStorage();
        syncManualTypeUI();
        bindEvents();
        registerOverlay();
        hydrateManualsCatalog();
        void loadManualsData();
        void updateRecommendedManual();
        window.setInterval(updateRecommendedManual, RECOMMENDATION_REFRESH_MS);
    }

    window.getManualsCatalog = () => allManualsData.slice();
    window.findBestManualForSubject = findBestManualForSubject;
    window.updateRecommendedManual = updateRecommendedManual;
    window.openManualForSubject = openManualForSubject;
    window.openManualEntry = openManualEntry;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
