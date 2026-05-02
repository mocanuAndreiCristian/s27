import {
    $,
    getAppConfig,
    dom,
    days,
    dayMap,
    mobileState,
    todayKey,
    nsub,
    now,
    stat,
    fDate,
    isMobile,
    waitForMinimumSkeletonVisibility,
    clearSkeletonVisible,
    ensureHost,
    getAdv,
    UI_KEY,
} from "./mobile-state.js";
import {
    renderCardsScroll,
    renderAccordion,
    renderTabs,
    renderKanbanScroll,
    renderSwipe,
    renderSplit,
    renderTimeline,
    renderChips,
    renderFullError,
    renderFullLoading,
    effectiveMode,
    setModeClass,
    setHeader,
    attachSwipe,
    renderTodaySkeleton,
    hideMobileRecommendedManual,
    setTodayEmptyState,
} from "./mobile-layouts.js";
import { openSheet, closeSheet, trig } from "./bottom-sheet.js";
import { upShortcuts, syncWeather } from "./shortcuts.js";
import { upHeader } from "./mobile-clock.js";
import {
    buildManualMap,
    getManualUrlForSubject as getManualUrlForSubjectFromMap,
} from "../timetable/schedule-utils.js";

export { openSheet, closeSheet } from "./bottom-sheet.js";
export { upShortcuts } from "./shortcuts.js";

let isBound = false;
let isInitialized = false;
let lastScrollTop = 0;
let headerIntervalId = null;
let refreshIntervalId = null;

function hasLoadedSchedule() {
    return Array.isArray(mobileState.sched);
}

function getManualFallback(subjectText = "") {
    const normalizedSubject = nsub(subjectText);
    return getManualUrlForSubjectFromMap(mobileState.manualMap, normalizedSubject)
        || `https://manuale.edu.ro/?s=${encodeURIComponent(normalizedSubject)}`;
}

export async function load() {
    if (hasLoadedSchedule()) return true;
    if (mobileState.loadPromise) return mobileState.loadPromise;

    mobileState.isLoading = true;
    mobileState.loadFailed = false;

    mobileState.loadPromise = (async () => {
        try {
            const { dataPath, classId } = getAppConfig();
            const scheduleSource = window.timetableData
                ? Promise.resolve(window.timetableData)
                : fetch(`${dataPath}${classId}.json`).then((response) => {
                    if (!response.ok) throw new Error("Failed to load schedule.");
                    return response.json();
                });
            const manualsSource = fetch(`${dataPath}manuals.json`).then((response) => {
                if (!response.ok) throw new Error("Failed to load manuals.");
                return response.json();
            });

            const [scheduleData, manuals] = await Promise.all([
                scheduleSource,
                manualsSource,
            ]);

            mobileState.sched = scheduleData.schedule || [];
            window.timetableData = scheduleData;
            mobileState.manualMap = buildManualMap(manuals);
            mobileState.week = null;
            mobileState.loadFailed = false;
            return true;
        } catch (error) {
            mobileState.sched = null;
            mobileState.manualMap = {};
            mobileState.week = null;
            mobileState.loadFailed = true;
            console.error(error);
            return false;
        } finally {
            mobileState.isLoading = false;
            mobileState.loadPromise = null;
        }
    })();

    return mobileState.loadPromise;
}

export function ensureScheduleLoaded() {
    if (hasLoadedSchedule()) return Promise.resolve(true);
    return load();
}

export function syncScheduleFromWindow() {
    if (hasLoadedSchedule() || !Array.isArray(window.timetableData?.schedule)) return false;
    mobileState.sched = window.timetableData.schedule;
    mobileState.week = null;
    mobileState.loadFailed = false;
    return true;
}

export function buildWeek() {
    if (mobileState.week) return mobileState.week;

    const nextWeek = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
    };

    (mobileState.sched || []).forEach((row) => {
        days.forEach((day) => {
            const subject = row[day.k];
            if (!subject) return;

            let emoji = subject.emoji || "";
            if (subject.flag) {
                emoji = `<span class="${subject.flag}" style="border-radius:var(--border-radius-sm);"></span>`;
            }

            nextWeek[day.k].push({
                time: row.time,
                subject: subject.name,
                emoji,
                dayKey: day.k,
                status: stat(row.time, day.k),
            });
        });
    });

    Object.keys(nextWeek).forEach((key) => {
        nextWeek[key] = nextWeek[key].map((entry, index) => ({
            ...entry,
            period: index + 1,
        }));
    });

    mobileState.week = nextWeek;
    return nextWeek;
}

export function renderFull() {
    syncScheduleFromWindow();
    const host = ensureHost();
    if (!host) return;

    const currentMode = effectiveMode();
    const weekData = hasLoadedSchedule() ? buildWeek() : null;

    setModeClass(currentMode);
    setHeader(currentMode);

    if (!hasLoadedSchedule()) {
        if (mobileState.loadFailed) renderFullError(currentMode);
        else renderFullLoading(currentMode);

        void ensureScheduleLoaded().then(async (ok) => {
            await waitForMinimumSkeletonVisibility("full");
            if (!ok && !hasLoadedSchedule()) {
                clearSkeletonVisible("full");
                renderFullError(currentMode);
                return;
            }

            clearSkeletonVisible("full");
            if (!dom.todayView?.classList.contains("active")) renderFull();
        });
        return;
    }

    const tableMode = currentMode === "standard" || currentMode === "standard-landscape";
    if (tableMode) {
        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
        host.classList.remove("is-loading");
        host.setAttribute("aria-busy", "false");
        host.style.display = "none";
        host.innerHTML = "";
        clearSkeletonVisible("full");
        return;
    }

    if (dom.timetableWrapper) dom.timetableWrapper.style.display = "none";
    host.classList.remove("is-loading");
    host.setAttribute("aria-busy", "false");
    host.style.display = "block";
    clearSkeletonVisible("full");

    if (currentMode === "cards-scroll") host.innerHTML = renderCardsScroll(weekData);
    else if (currentMode === "cards-swipe") {
        host.innerHTML = renderSwipe(weekData, "cards-swipe");
        attachSwipe(host, renderFull);
    } else if (currentMode === "accordion") host.innerHTML = renderAccordion(weekData);
    else if (currentMode === "tabs-text") host.innerHTML = renderTabs(weekData, false);
    else if (currentMode === "tabs-pill") host.innerHTML = renderTabs(weekData, true);
    else if (currentMode === "kanban-scroll") host.innerHTML = renderKanbanScroll(weekData);
    else if (currentMode === "kanban-swipe") {
        host.innerHTML = renderSwipe(weekData, "kanban-swipe");
        attachSwipe(host, renderFull);
    } else if (currentMode === "split-columns") host.innerHTML = renderSplit(weekData);
    else if (currentMode === "timeline-stack") host.innerHTML = renderTimeline(weekData);
    else if (currentMode === "day-chips") host.innerHTML = renderChips(weekData);
    else {
        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
        host.style.display = "none";
        host.innerHTML = "";
    }
}

export function onHostClick(event) {
    const card = event.target.closest('[data-subject-card="1"]');
    if (card) {
        const interactionMode = getAdv().interactionMode || "link";
        if (interactionMode === "mark") {
            card.classList.toggle("marked-subject");
        } else {
            const subject = nsub(card.getAttribute("data-subject-name") || "");
            const fallback = getManualFallback(subject);
            if (window.openManualForSubject) {
                void window.openManualForSubject(subject, fallback);
            } else {
                window.open(fallback, "_blank");
            }
        }
        return;
    }

    const tabButton = event.target.closest("[data-day-tab]");
    if (tabButton) {
        mobileState.tab = tabButton.getAttribute("data-day-tab") || "monday";
        renderFull();
        return;
    }

    const chipButton = event.target.closest("[data-day-chip]");
    if (chipButton) {
        mobileState.chips = chipButton.getAttribute("data-day-chip") || "monday";
        renderFull();
        return;
    }

    const dotButton = event.target.closest("[data-swipe-dot]");
    if (dotButton) {
        const index = Number(dotButton.getAttribute("data-swipe-dot"));
        if (!Number.isNaN(index)) {
            mobileState.swipe = Math.max(0, Math.min(days.length - 1, index));
            renderFull();
        }
        return;
    }

    if (event.target.closest('[data-swipe-prev="1"]')) {
        mobileState.swipe = (mobileState.swipe - 1 + days.length) % days.length;
        renderFull();
        return;
    }

    if (event.target.closest('[data-swipe-next="1"]')) {
        mobileState.swipe = (mobileState.swipe + 1) % days.length;
        renderFull();
    }
}

export function fillToday() {
    if (!dom.todayCards || !dom.todayDate) return;

    syncScheduleFromWindow();
    const current = now();
    dom.todayDate.textContent = fDate(new Date());

    const markedCards = new Set();
    dom.todayCards.querySelectorAll(".today-card.marked-subject").forEach((card) => {
        const periodEl = card.querySelector(".period");
        if (periodEl) {
            markedCards.add(periodEl.textContent.trim());
        }
    });

    dom.todayCards.innerHTML = "";
    if (!hasLoadedSchedule()) {
        if (mobileState.loadFailed) {
            hideMobileRecommendedManual();
            dom.todayCards.style.display = "none";
            dom.todayCards.setAttribute("aria-busy", "false");
            setTodayEmptyState(
                "Unable to load the timetable right now.",
                "fa-solid fa-triangle-exclamation",
            );
            return;
        }

        renderTodaySkeleton();
        void ensureScheduleLoaded().then(async (ok) => {
            await waitForMinimumSkeletonVisibility("today");
            if (!dom.todayView?.classList.contains("active")) return;
            if (!ok && !hasLoadedSchedule()) {
                hideMobileRecommendedManual();
                dom.todayCards.style.display = "none";
                dom.todayCards.setAttribute("aria-busy", "false");
                clearSkeletonVisible("today");
                setTodayEmptyState(
                    "Unable to load the timetable right now.",
                    "fa-solid fa-triangle-exclamation",
                );
                return;
            }

            clearSkeletonVisible("today");
            fillToday();
        });
        return;
    }

    const todayScheduleKey = dayMap[current.day];
    if (!todayScheduleKey) {
        hideMobileRecommendedManual();
        dom.todayCards.style.display = "none";
        dom.todayCards.setAttribute("aria-busy", "false");
        setTodayEmptyState("No classes today!", "fa-solid fa-umbrella-beach");
        return;
    }

    const todayEntries = buildWeek()[todayScheduleKey] || [];
    if (!todayEntries.length) {
        hideMobileRecommendedManual();
        dom.todayCards.style.display = "none";
        dom.todayCards.setAttribute("aria-busy", "false");
        setTodayEmptyState("No classes today!", "fa-solid fa-umbrella-beach");
        return;
    }

    dom.todayCards.style.display = "flex";
    dom.todayCards.setAttribute("aria-busy", "false");
    dom.todayEmpty?.classList.remove("active");
    clearSkeletonVisible("today");

    todayEntries.forEach((entry, index) => {
        const el = document.createElement("div");
        const periodLabel = `Period ${entry.period}`;
        el.className = `today-card ${entry.status}${markedCards.has(periodLabel) ? " marked-subject" : ""}`;
        el.style.animationDelay = `${index * 0.05}s`;
        el.innerHTML = `<div class="today-card-time"><div class="time">${entry.time}</div><div class="period">${periodLabel}</div></div><div class="today-card-emoji">${entry.emoji}</div><div class="today-card-subject">${entry.subject}</div>`;
        el.addEventListener("click", () => {
            const interactionMode = getAdv().interactionMode || "link";
            if (interactionMode === "mark") {
                el.classList.toggle("marked-subject");
            } else {
                const subject = nsub(entry.subject);
                const fallback = getManualFallback(subject);
                if (window.openManualForSubject) {
                    void window.openManualForSubject(subject, fallback);
                } else {
                    window.open(fallback, "_blank");
                }
            }
        });
        dom.todayCards.appendChild(el);
    });
}

export function showToday() {
    if (!dom.todayView) return;
    dom.navToday?.classList.add("active");
    dom.navFull?.classList.remove("active");
    dom.todayView.classList.add("active");
    if (isMobile()) {
        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "none";
        const host = ensureHost();
        if (host) host.style.display = "none";
    }
    fillToday();
}

export function showFull() {
    if (!dom.todayView) return;
    dom.navFull?.classList.add("active");
    dom.navToday?.classList.remove("active");
    dom.todayView.classList.remove("active");
    renderFull();
}

export function onScroll() {
    if (!document.body.classList.contains("mobile-nav-scroll")) {
        if (dom.bottomNavbar) dom.bottomNavbar.style.transform = "";
        return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        if (dom.bottomNavbar) dom.bottomNavbar.style.transform = "translateY(100%)";
    } else if (dom.bottomNavbar) {
        dom.bottomNavbar.style.transform = "translateY(0)";
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}

export function onModeChange() {
    if (dom.todayView?.classList.contains("active") && isMobile()) return;
    renderFull();
}

export function bind() {
    if (isBound) return;
    isBound = true;

    dom.navToday?.addEventListener("click", showToday);
    dom.navFull?.addEventListener("click", showFull);
    dom.bottomMenuBtn?.addEventListener("click", openSheet);
    dom.navShortcut1?.addEventListener("click", () =>
        trig(dom.navShortcut1.dataset.shortcutType || "customization"),
    );
    dom.navShortcut2?.addEventListener("click", () =>
        trig(dom.navShortcut2.dataset.shortcutType || "weather"),
    );
    dom.bottomSheetOverlay?.addEventListener("click", closeSheet);
    dom.sheetCustomizationBtn?.addEventListener("click", () => trig("customization"));
    dom.sheetWeatherBtn?.addEventListener("click", () => trig("weather"));
    dom.sheetClockBtn?.addEventListener("click", () => trig("clock"));
    dom.sheetTodoBtn?.addEventListener("click", () => trig("tasks"));
    dom.sheetLibraryBtn?.addEventListener("click", () => trig("library"));
    dom.sheetInfoBtn?.addEventListener("click", () => trig("info"));

    let startY = 0;
    dom.bottomSheet?.addEventListener("touchstart", (event) => {
        startY = event.touches[0].clientY;
    }, { passive: true });
    dom.bottomSheet?.addEventListener("touchmove", (event) => {
        if (event.touches[0].clientY - startY > 50) closeSheet();
    }, { passive: true });

    const observer = new MutationObserver(syncWeather);
    const menuWeatherEmoji = $("#menuWeatherEmoji");
    if (menuWeatherEmoji) {
        observer.observe(menuWeatherEmoji, { characterData: true, childList: true, subtree: true });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) showFull();
        else if (!dom.todayView?.classList.contains("active")) renderFull();
    });
    window.addEventListener("fullLayoutModeChanged", onModeChange);
    window.addEventListener("storage", (event) => {
        if (event.key === UI_KEY) onModeChange();
    });

    const host = ensureHost();
    if (host) host.addEventListener("click", onHostClick);
}

export function init() {
    if (isInitialized) return;
    isInitialized = true;

    bind();

    const today = todayKey();
    const todayIndex = days.findIndex((day) => day.k === today);
    if (todayIndex >= 0) {
        mobileState.swipe = todayIndex;
        mobileState.tab = today;
        mobileState.chips = today;
    }

    ensureHost();
    upShortcuts();
    syncWeather();
    upHeader();

    if (!headerIntervalId) {
        headerIntervalId = window.setInterval(upHeader, 1000);
    }

    if (isMobile()) showToday();
    else showFull();

    void ensureScheduleLoaded();

    if (!refreshIntervalId) {
        refreshIntervalId = window.setInterval(() => {
            mobileState.week = null;
            if (dom.todayView?.classList.contains("active")) fillToday();
            else renderFull();
        }, 30000);
    }
}
