/* ========================================
   MANUALS: Recommendation + Subject Opening
   ======================================== */

(function () {
    "use strict";

    const RECOMMENDATION_REFRESH_MS = 30000;
    const SEARCH_FALLBACK_URL = "https://manuale.edu.ro/?s=";

    let allManualsData = [];

    function normalizeText(value = "") {
        const stripped = String(value).replace(/<[^>]*>/g, " ");
        const lettersOnly = stripped.replace(/[^\p{L}\p{N}\s]/gu, " ");
        const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
        return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
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

    function addSearchMetadata(manual = {}) {
        const title = String(manual.title || "").trim() || "Untitled Manual";
        const subject = String(manual.subject || "").trim() || title;

        return {
            ...manual,
            title,
            subject,
            image: String(manual.image || "").trim(),
            link: normalizeManualLink(manual.link) || buildSearchUrl(subject),
            _titleNorm: normalizeText(title),
            _subjectNorm: normalizeText(subject),
        };
    }

    function setManualCatalog(manuals) {
        allManualsData = manuals.slice();
        window.manualsCatalog = allManualsData.slice();
        window.dispatchEvent(
            new CustomEvent("manuals:updated", {
                detail: { manuals: allManualsData.slice() },
            }),
        );
    }

    async function loadManualsData() {
        const dataPath = window.DATA_PATH || "data/";

        try {
            const response = await fetch(`${dataPath}manuals.json`);
            if (!response.ok) {
                throw new Error("Failed to load manuals.json");
            }

            const data = await response.json();
            const manuals = Array.isArray(data) ? data : [];
            setManualCatalog(manuals.map((manual) => addSearchMetadata(manual)));
        } catch (error) {
            setManualCatalog([]);
            console.error("Error loading manuals data:", error);
        } finally {
            void updateRecommendedManual();
        }
    }

    function openManualEntry(manual, fallbackUrl = "") {
        const targetUrl = manual?.link || fallbackUrl || buildSearchUrl(manual?.subject || manual?.title || "");
        if (!targetUrl) return false;
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

    function openManualForSubject(subjectText, fallbackUrl = "") {
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
                    openManualEntry(best, buildSearchUrl(matchedSubject));
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
                    openManualEntry(best, buildSearchUrl(matchedSubject));
                };
            }
        }
    }

    function init() {
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
