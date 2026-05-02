import { getAppConfig } from "../core/config.js";
import { getDevDayOverride, getDevTimeOverride } from "../core/time.js";
import { buildSearchUrl } from "./manuals-model.js";
import { openManualEntries, openManualEntry } from "./manual-actions.js";
import { getLibrarySettings, getManualSetForSubject } from "./manuals-store.js";

let currentChoiceState = null;

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

    if (titleEl) titleEl.textContent = state.subjectText || "Manuale";
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

export function openManualForSubject(subjectText, fallbackUrl = "") {
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

export async function updateRecommendedManual() {
    const devOverride = getDevTimeOverride();
    const devDayOverride = getDevDayOverride();
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
        const { dataPath, classId } = getAppConfig();

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

export function initRecommendedManuals({ refreshMs = 30000 } = {}) {
    initChoiceOverlay();
    window.setInterval(updateRecommendedManual, refreshMs);
    window.addEventListener("library-settings:updated", () => {
        void updateRecommendedManual();
    });
    window.addEventListener("manuals:updated", () => {
        void updateRecommendedManual();
    });
}

