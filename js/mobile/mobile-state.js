import { getAppConfig as getCoreAppConfig } from "../core/config.js";

export const UI_KEY = "customization-ui-settings";

export function getAppConfig() {
    if (window.AppCore?.getConfig) {
        return window.AppCore.getConfig();
    }

    return getCoreAppConfig();
}

export const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s));

export const dom = {
    bottomNavbar: $("#bottomNavbar"),
    navToday: $("#navToday"),
    navFull: $("#navFull"),
    bottomMenuBtn: $("#bottomMenuBtn"),
    navShortcut1: $("#navShortcut1"),
    navShortcut2: $("#navShortcut2"),
    todayView: $("#todayView"),
    todayCards: $("#todayCards"),
    todayEmpty: $("#todayEmpty"),
    todayDate: $("#todayDate"),
    bottomSheet: $("#bottomSheet"),
    bottomSheetOverlay: $("#bottomSheetOverlay"),
    timetableWrapper: $(".timetable-wrapper"),
    fullViewHeader: $("#fullViewHeader"),
    sheetCustomizationBtn: $("#sheetCustomizationBtn"),
    sheetWeatherBtn: $("#sheetWeatherBtn"),
    sheetClockBtn: $("#sheetClockBtn"),
    sheetTodoBtn: $("#sheetTodoBtn"),
    sheetLibraryBtn: $("#sheetLibraryBtn"),
    sheetInfoBtn: $("#sheetInfoBtn"),
    mobileHeaderTime: $("#mobileHeaderTime"),
    mobileHeaderDate: $("#mobileHeaderDate"),
};

export const days = [
    { k: "monday", l: "Luni", s: "Lu" },
    { k: "tuesday", l: "Marti", s: "Ma" },
    { k: "wednesday", l: "Miercuri", s: "Mi" },
    { k: "thursday", l: "Joi", s: "Jo" },
    { k: "friday", l: "Vineri", s: "Vi" },
];

export const dayMap = {
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
};

export const shortcuts = {
    customization: ["fa-solid fa-sliders", "Custom"],
    weather: ["fa-solid fa-cloud-sun", "Weather"],
    clock: ["fa-solid fa-clock", "Clock"],
    tasks: ["fa-solid fa-list-check", "Tasks"],
    info: ["fa-solid fa-circle-info", "Info"],
    library: ["fa-solid fa-book-open", "Biblioteca"],
};

export const MIN_SKELETON_VISIBLE_MS = 430;

export const mobileState = {
    sched: null,
    manualMap: {},
    host: null,
    week: null,
    swipe: 0,
    tab: "monday",
    chips: "monday",
    loadPromise: null,
    isLoading: false,
    loadFailed: false,
};

export const skeletonShownAt = {
    today: 0,
    full: 0,
};

export function getNow() {
    return window.performance?.now ? window.performance.now() : Date.now();
}

export function applyRandomSkeletonDelay(root) {
    if (!root) return;

    root.querySelectorAll(".skeleton-loading").forEach((el) => {
        const delay = 0.43 + Math.random() * (0.71 - 0.43);
        el.style.animationDelay = `${delay.toFixed(3)}s`;
    });
}

export function markSkeletonVisible(key) {
    if (!skeletonShownAt[key]) {
        skeletonShownAt[key] = getNow();
    }
}

export function clearSkeletonVisible(key) {
    skeletonShownAt[key] = 0;
}

export function waitForMinimumSkeletonVisibility(key) {
    if (!skeletonShownAt[key]) return Promise.resolve();

    const elapsed = getNow() - skeletonShownAt[key];
    const remaining = Math.max(0, MIN_SKELETON_VISIBLE_MS - elapsed);
    if (!remaining) return Promise.resolve();

    return new Promise((resolve) => {
        window.setTimeout(resolve, remaining);
    });
}

export const modeClasses = [
    "layout-standard-landscape",
    "layout-cards-scroll",
    "layout-cards-swipe",
    "layout-accordion",
    "layout-tabs-text",
    "layout-tabs-pill",
    "layout-kanban-scroll",
    "layout-kanban-swipe",
    "layout-split-columns",
    "layout-timeline-stack",
    "layout-day-chips",
];

export function getUI() {
    try {
        return JSON.parse(localStorage.getItem(UI_KEY) || "{}");
    } catch {
        return {};
    }
}

export function getAdv() {
    try {
        return JSON.parse(localStorage.getItem("advancedSettings") || "{}");
    } catch {
        return {};
    }
}

export function mode() {
    return getUI().fullLayoutMode || "standard";
}

export function isMobile() {
    return window.innerWidth <= 768;
}

export function todayKey() {
    const devDayOverride = window.getDevDayOverride?.();
    const dayOfWeek = devDayOverride !== null ? devDayOverride : new Date().getDay();
    return dayMap[dayOfWeek] || null;
}

export function nsub(t) {
    if (!t) return "";
    return t
        .replace(
            /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu,
            "",
        )
        .replace(/[^0-9\p{L}\s\-]+/gu, "")
        .trim()
        .toLowerCase();
}

export function now() {
    const devOverride = window.getDevTimeOverride?.();
    const devDayOverride = window.getDevDayOverride?.();
    const d = devOverride || new Date();
    const realDay = d.getDay();
    const day = devDayOverride !== null ? devDayOverride : realDay;
    return { h: d.getHours(), m: d.getMinutes(), day: day };
}

export function stat(time, dayKey) {
    if (dayKey !== todayKey()) return "";
    const n = now(),
        cm = n.h * 60 + n.m;
    const [h, m] = time.split(":").map(Number);
    const classStartMinutes = h * 60 + (m || 0);
    const windowStart = classStartMinutes - 10;
    const windowEnd = classStartMinutes + 50;
    return cm >= windowStart && cm < windowEnd ? "current" : cm >= windowEnd ? "past" : "future";
}

export function fDate(d) {
    const dd = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const mm = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    return `${dd[d.getDay()]}, ${mm[d.getMonth()]} ${d.getDate()}`;
}

export function ensureHost() {
    if (mobileState.host) return mobileState.host;
    const c = dom.timetableWrapper?.parentElement;
    if (!c) return null;
    mobileState.host = document.createElement("section");
    mobileState.host.id = "fullLayoutsHost";
    mobileState.host.className = "full-layout-host";
    mobileState.host.style.display = "none";
    c.insertBefore(mobileState.host, dom.timetableWrapper.nextSibling);
    // onHostClick will be added in controller
    return mobileState.host;
}
