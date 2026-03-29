(function () {
    "use strict";
    const UI_KEY = "customization-ui-settings";
    const $ = (s) => document.querySelector(s),
        $$ = (s) => Array.from(document.querySelectorAll(s));
    const dom = {
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
        sheetManualsBtn: $("#sheetManualsBtn"),
        sheetClockBtn: $("#sheetClockBtn"),
        sheetTodoBtn: $("#sheetTodoBtn"),
        sheetInfoBtn: $("#sheetInfoBtn"),
        mobileHeaderTime: $("#mobileHeaderTime"),
        mobileHeaderDate: $("#mobileHeaderDate"),
    };
    const days = [
        { k: "monday", l: "Luni", s: "Lu" },
        { k: "tuesday", l: "Marti", s: "Ma" },
        { k: "wednesday", l: "Miercuri", s: "Mi" },
        { k: "thursday", l: "Joi", s: "Jo" },
        { k: "friday", l: "Vineri", s: "Vi" },
    ];
    const dayMap = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
    };
    const shortcuts = {
        customization: ["fa-solid fa-sliders", "Custom"],
        weather: ["fa-solid fa-cloud-sun", "Weather"],
        textbooks: ["fa-solid fa-book-open-reader", "Manuals"],
        clock: ["fa-solid fa-clock", "Clock"],
        tasks: ["fa-solid fa-list-check", "Tasks"],
        info: ["fa-solid fa-circle-info", "Info"],
    };
    const MIN_SKELETON_VISIBLE_MS = 430;
    let sched = null,
        manualMap = {},
        host = null,
        week = null,
        swipe = 0,
        tab = "monday",
        chips = "monday",
        loadPromise = null,
        isLoading = false,
        loadFailed = false;
    const skeletonShownAt = {
        today: 0,
        full: 0,
    };
    function getNow() {
        return window.performance?.now ? window.performance.now() : Date.now();
    }
    function applyRandomSkeletonDelay(root) {
        if (!root) return;

        root.querySelectorAll(".skeleton-loading").forEach((el) => {
            const delay = 0.43 + Math.random() * (0.71 - 0.43);
            el.style.animationDelay = `${delay.toFixed(3)}s`;
        });
    }
    function markSkeletonVisible(key) {
        if (!skeletonShownAt[key]) {
            skeletonShownAt[key] = getNow();
        }
    }
    function clearSkeletonVisible(key) {
        skeletonShownAt[key] = 0;
    }
    function waitForMinimumSkeletonVisibility(key) {
        if (!skeletonShownAt[key]) return Promise.resolve();

        const elapsed = getNow() - skeletonShownAt[key];
        const remaining = Math.max(0, MIN_SKELETON_VISIBLE_MS - elapsed);
        if (!remaining) return Promise.resolve();

        return new Promise((resolve) => {
            window.setTimeout(resolve, remaining);
        });
    }
    const modeClasses = [
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

    function getUI() {
        try {
            return JSON.parse(localStorage.getItem(UI_KEY) || "{}");
        } catch {
            return {};
        }
    }
    function getAdv() {
        try {
            return JSON.parse(localStorage.getItem("advancedSettings") || "{}");
        } catch {
            return {};
        }
    }
    function mode() {
        return getUI().fullLayoutMode || "standard";
    }
    function isMobile() {
        return window.innerWidth <= 768;
    }
    function todayKey() {
        const devDayOverride = window.getDevDayOverride?.();
        const dayOfWeek = devDayOverride !== null ? devDayOverride : new Date().getDay();
        return dayMap[dayOfWeek] || null;
    }
    function nsub(t) {
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
    function now() {
        const devOverride = window.getDevTimeOverride?.();
        const devDayOverride = window.getDevDayOverride?.();
        const d = devOverride || new Date();
        const realDay = d.getDay();
        const day = devDayOverride !== null ? devDayOverride : realDay;
        return { h: d.getHours(), m: d.getMinutes(), day: day };
    }
    function stat(time, dayKey) {
        if (dayKey !== todayKey()) return "";
        const n = now(),
            cm = n.h * 60 + n.m;
        const [h, m] = time.split(":").map(Number);
        const classStartMinutes = h * 60 + (m || 0);
        const windowStart = classStartMinutes - 10;
        const windowEnd = classStartMinutes + 50;
        return cm >= windowStart && cm < windowEnd ? "current" : cm >= windowEnd ? "past" : "future";
    }
    function fDate(d) {
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
    async function load() {
        if (sched) return true;
        if (loadPromise) return loadPromise;

        isLoading = true;
        loadFailed = false;

        loadPromise = (async () => {
            try {
                const scheduleSource = window.timetableData
                    ? Promise.resolve(window.timetableData)
                    : fetch(`${p}${id}.json`).then((response) => {
                          if (!response.ok) throw new Error("Failed to load schedule.");
                          return response.json();
                      });
                const manualsSource = fetch(`${p}manuals.json`).then((response) => {
                    if (!response.ok) throw new Error("Failed to load manuals.");
                    return response.json();
                });

                const [scheduleData, manuals] = await Promise.all([
                    scheduleSource,
                    manualsSource,
                ]);

                sched = scheduleData.schedule || [];
                window.timetableData = scheduleData;
                manualMap = {};
                manuals.forEach(
                    (x) => x.subject && (manualMap[x.subject.toLowerCase()] = x.link),
                );
                week = null;
                loadFailed = false;
                return true;
            } catch (e) {
                sched = null;
                manualMap = {};
                week = null;
                loadFailed = true;
                console.error(e);
                return false;
            } finally {
                isLoading = false;
                loadPromise = null;
            }
        })();

        return loadPromise;
    }
    function ensureScheduleLoaded() {
        if (sched) return Promise.resolve(true);
        return load();
    }
    function syncScheduleFromWindow() {
        if (sched || !Array.isArray(window.timetableData?.schedule)) return false;
        sched = window.timetableData.schedule;
        week = null;
        loadFailed = false;
        return true;
    }
    function ensureHost() {
        if (host) return host;
        const c = dom.timetableWrapper?.parentElement;
        if (!c) return null;
        host = document.createElement("section");
        host.id = "fullLayoutsHost";
        host.className = "full-layout-host";
        host.style.display = "none";
        c.insertBefore(host, dom.timetableWrapper.nextSibling);
        host.addEventListener("click", onHostClick);
        return host;
    }
    function buildWeek() {
        if (week) return week;
        const out = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
        };
        (sched || []).forEach((r) =>
            days.forEach((d) => {
                const o = r[d.k];
                if (!o) return;
                let e = o.emoji || "";
                if (o.flag)
                    e = `<span class="${o.flag}" style="border-radius:var(--border-radius-sm);"></span>`;
                out[d.k].push({
                    time: r.time,
                    subject: o.name,
                    emoji: e,
                    dayKey: d.k,
                    status: stat(r.time, d.k),
                });
            }),
        );
        Object.keys(out).forEach(
            (k) => (out[k] = out[k].map((x, i) => ({ ...x, period: i + 1 }))),
        );
        week = out;
        return out;
    }
    function cards(entries, cls = "full-subject-card") {
        if (!entries.length) return '<div class="full-day-empty">No classes</div>';
        return entries
            .map(
                (e) =>
                    `<button type="button" class="${cls}${e.status ? ` ${e.status}` : ""}" data-subject-card="1" data-subject-name="${e.subject}"><div class="full-card-time"><div class="time">${e.time}</div><div class="period">Period ${e.period}</div></div><div class="full-card-emoji">${e.emoji}</div><div class="full-card-subject">${e.subject}</div></button>`,
            )
            .join("");
    }
    function panel(d, entries, c = "") {
        return `<section class="full-day-panel ${c}${todayKey() === d.k ? " is-today" : ""}"><header class="full-day-header"><h3>${d.l}</h3><span>${entries.length} classes</span></header><div class="full-day-cards">${cards(entries)}</div></section>`;
    }
    function renderCardsScroll(w) {
        return `<div class="layout-cards-scroll-wrap">${days.map((d) => panel(d, w[d.k] || [], "cards-scroll-day")).join("")}</div>`;
    }
    function renderAccordion(w) {
        return `<div class="layout-accordion-wrap">${days
            .map((d, i) => {
                const open =
                    d.k === todayKey() || (!todayKey() && i === 0) ? " open" : "";
                const en = w[d.k] || [];
                return `<details class="accordion-day"${open}><summary><span>${d.l}</span><span>${en.length} classes</span></summary><div class="accordion-content">${cards(en)}</div></details>`;
            })
            .join("")}</div>`;
    }
    function renderTabs(w, pill) {
        const a = (pill ? tab : tab) && w[tab] ? tab : todayKey() || "monday";
        tab = a;
        return `<div class="layout-tabs-wrap ${pill ? "tabs-pill" : "tabs-text"}"><div class="full-day-tabs">${days.map((d) => `<button type="button" class="full-day-tab ${d.k === a ? "active" : ""}" data-day-tab="${d.k}">${d.l}</button>`).join("")}</div><div class="full-day-tab-content">${panel(
            days.find((d) => d.k === a),
            w[a] || [],
            pill ? "tab-pill-day" : "tab-text-day",
        )}</div></div>`;
    }
    function renderKanbanScroll(w) {
        return `<div class="layout-kanban-scroll-wrap">${days
            .map((d) => {
                const en = w[d.k] || [];
                return `<section class="kanban-column"><header><h3>${d.l}</h3><span>${en.length}</span></header><div class="kanban-cards">${cards(en, "full-subject-card kanban-card")}</div></section>`;
            })
            .join("")}</div>`;
    }
    function renderSwipe(w, variant) {
        const d = days[swipe] || days[0],
            en = w[d.k] || [],
            kan = variant === "kanban-swipe";
        return `<div class="${kan ? "layout-kanban-swipe-wrap" : "layout-cards-swipe-wrap"}"><div class="swipe-head"><button type="button" class="swipe-nav" data-swipe-prev="1"><i class="fa-solid fa-chevron-left"></i></button><h3>${d.l}</h3><button type="button" class="swipe-nav" data-swipe-next="1"><i class="fa-solid fa-chevron-right"></i></button></div><div class="swipe-body" data-swipe-track="1">${kan ? `<section class="kanban-column swipe-kanban"><header><h3>${d.l}</h3><span>${en.length}</span></header><div class="kanban-cards">${cards(en, "full-subject-card kanban-card")}</div></section>` : panel(d, en, "swipe-day")}</div><div class="swipe-dots">${days.map((x, i) => `<button type="button" class="swipe-dot ${i === swipe ? "active" : ""}" data-swipe-dot="${i}"></button>`).join("")}</div></div>`;
    }
    function renderSplit(w) {
        const mk = (arr, t) =>
            `<div class="split-column"><h3>${t}</h3>${arr
                .map((k) =>
                    panel(
                        days.find((d) => d.k === k),
                        w[k] || [],
                        "split-day",
                    ),
                )
                .join("")}</div>`;
        return `<div class="layout-split-columns-wrap">${mk(["monday", "wednesday", "friday"], "Column A")}${mk(["tuesday", "thursday"], "Column B")}</div>`;
    }
    function renderTimeline(w) {
        return `<div class="layout-timeline-stack-wrap">${days
            .map((d) => {
                const en = w[d.k] || [];
                if (!en.length)
                    return `<section class="timeline-day"><header><h3>${d.l}</h3></header><div class="timeline-empty">No classes</div></section>`;
                return `<section class="timeline-day"><header><h3>${d.l}</h3></header><div class="timeline-list">${en.map((e) => `<button type="button" class="timeline-item ${e.status || ""}" data-subject-card="1" data-subject-name="${e.subject}"><div class="timeline-dot"></div><div class="timeline-main"><div class="timeline-time">${e.time}</div><div class="timeline-subject">${e.subject}</div></div><div class="timeline-emoji">${e.emoji}</div></button>`).join("")}</div></section>`;
            })
            .join("")}</div>`;
    }
    function renderChips(w) {
        const a = w[chips] ? chips : todayKey() || "monday";
        chips = a;
        return `<div class="layout-day-chips-wrap"><div class="day-chips-row">${days.map((d) => `<button type="button" class="day-chip ${d.k === a ? "active" : ""}" data-day-chip="${d.k}"><span>${d.s}</span></button>`).join("")}</div><div class="day-chips-content">${panel(
            days.find((d) => d.k === a),
            w[a] || [],
            "chips-day",
        )}</div></div>`;
    }
    function setHostBusyState(active) {
        const h = ensureHost();
        if (!h) return null;
        h.classList.toggle("is-loading", active);
        h.setAttribute("aria-busy", active ? "true" : "false");
        return h;
    }
    function hideMobileRecommendedManual() {
        const manual = $("#mobileRecommendedManual");
        if (!manual) return;
        manual.classList.remove("active");
        manual.innerHTML = "";
    }
    function setTodayEmptyState(message, iconClass) {
        if (!dom.todayEmpty) return;
        const icon = dom.todayEmpty.querySelector("i");
        const text = dom.todayEmpty.querySelector("p");
        if (icon && iconClass) icon.className = iconClass;
        if (text) text.textContent = message;
        dom.todayEmpty.classList.add("active");
    }
    function todaySkeletonMarkup(count = 5) {
        return Array.from({ length: count }, () => `
            <div class="today-card is-skeleton" aria-hidden="true">
                <div class="today-card-time">
                    <span class="mobile-skeleton-line skeleton-loading short"></span>
                    <span class="mobile-skeleton-line skeleton-loading tiny"></span>
                </div>
                <div class="today-card-emoji">
                    <span class="mobile-skeleton-circle skeleton-loading"></span>
                </div>
                <div class="today-card-subject">
                    <span class="mobile-skeleton-line skeleton-loading long"></span>
                    <span class="mobile-skeleton-line skeleton-loading medium"></span>
                </div>
            </div>
        `).join("");
    }
    function renderTodaySkeleton() {
        if (!dom.todayCards || !dom.todayDate) return;
        dom.todayDate.textContent = fDate(new Date());
        hideMobileRecommendedManual();
        dom.todayCards.style.display = "flex";
        dom.todayCards.setAttribute("aria-busy", "true");
        dom.todayCards.innerHTML = todaySkeletonMarkup();
        markSkeletonVisible("today");
        applyRandomSkeletonDelay(dom.todayCards);
        dom.todayEmpty?.classList.remove("active");
    }
    function createFullCardSkeleton(cls = "full-subject-card") {
        return `
            <div class="${cls} is-skeleton" aria-hidden="true">
                <div class="full-card-time">
                    <span class="mobile-skeleton-line skeleton-loading short"></span>
                    <span class="mobile-skeleton-line skeleton-loading tiny"></span>
                </div>
                <div class="full-card-emoji">
                    <span class="mobile-skeleton-circle skeleton-loading"></span>
                </div>
                <div class="full-card-subject">
                    <span class="mobile-skeleton-line skeleton-loading long"></span>
                    <span class="mobile-skeleton-line skeleton-loading medium"></span>
                </div>
            </div>
        `;
    }
    function createTimelineSkeleton() {
        return `
            <div class="timeline-item is-skeleton" aria-hidden="true">
                <div class="timeline-dot skeleton-loading"></div>
                <div class="timeline-main">
                    <span class="mobile-skeleton-line skeleton-loading short"></span>
                    <span class="mobile-skeleton-line skeleton-loading long"></span>
                </div>
                <div class="timeline-emoji">
                    <span class="mobile-skeleton-circle skeleton-loading"></span>
                </div>
            </div>
        `;
    }
    function createDayPanelSkeleton(cardCount = 3, extraClass = "") {
        return `
            <section class="full-day-panel ${extraClass} is-skeleton" aria-hidden="true">
                <header class="full-day-header">
                    <h3><span class="mobile-skeleton-line skeleton-loading medium"></span></h3>
                    <span class="mobile-skeleton-line skeleton-loading tiny"></span>
                </header>
                <div class="full-day-cards">${Array.from({ length: cardCount }, () => createFullCardSkeleton()).join("")}</div>
            </section>
        `;
    }
    function renderFullError(m) {
        const h = setHostBusyState(false);
        if (!h) return;
        const message = '<div class="mobile-layout-message"><i class="fa-solid fa-triangle-exclamation"></i><p>Unable to load the timetable right now.</p></div>';
        const tableMode = m === "standard" || m === "standard-landscape";
        if (tableMode) {
            if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
            h.style.display = "none";
            h.innerHTML = "";
            window.showTimetableError?.("Unable to load the timetable right now.");
            return;
        }

        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "none";
        h.style.display = "block";
        h.innerHTML = `<section class="full-day-panel mobile-layout-error">${message}</section>`;
    }
    function renderFullLoading(m) {
        const h = setHostBusyState(true);
        if (!h) return;
        markSkeletonVisible("full");
        const tableMode = m === "standard" || m === "standard-landscape";
        if (tableMode) {
            if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
            h.style.display = "none";
            h.innerHTML = "";
            window.showTimetableSkeleton?.();
            return;
        }

        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "none";
        h.style.display = "block";

        if (m === "cards-scroll") {
            h.innerHTML = `<div class="layout-cards-scroll-wrap mobile-layout-skeleton">${Array.from({ length: 3 }, () => createDayPanelSkeleton()).join("")}</div>`;
        } else if (m === "cards-swipe" || m === "kanban-swipe") {
            const body = m === "kanban-swipe"
                ? `<section class="kanban-column is-skeleton" aria-hidden="true"><header><h3><span class="mobile-skeleton-line skeleton-loading medium"></span></h3><span class="mobile-skeleton-line skeleton-loading tiny"></span></header><div class="kanban-cards">${Array.from({ length: 4 }, () => createFullCardSkeleton("full-subject-card kanban-card")).join("")}</div></section>`
                : createDayPanelSkeleton(4, "swipe-day");
            h.innerHTML = `<div class="${m === "kanban-swipe" ? "layout-kanban-swipe-wrap" : "layout-cards-swipe-wrap"} mobile-layout-skeleton"><div class="swipe-head"><span class="swipe-nav is-skeleton" aria-hidden="true"></span><h3><span class="mobile-skeleton-line skeleton-loading medium"></span></h3><span class="swipe-nav is-skeleton" aria-hidden="true"></span></div><div class="swipe-body">${body}</div><div class="swipe-dots">${days.map(() => '<span class="swipe-dot is-skeleton" aria-hidden="true"></span>').join("")}</div></div>`;
        } else if (m === "accordion") {
            h.innerHTML = `<div class="layout-accordion-wrap mobile-layout-skeleton">${Array.from({ length: 3 }, () => `<section class="accordion-day is-skeleton" aria-hidden="true"><div class="mobile-accordion-skeleton"><span class="mobile-skeleton-line skeleton-loading medium"></span><span class="mobile-skeleton-line skeleton-loading tiny"></span></div></section>`).join("")}</div>`;
        } else if (m === "tabs-text" || m === "tabs-pill") {
            h.innerHTML = `<div class="layout-tabs-wrap ${m === "tabs-pill" ? "tabs-pill" : "tabs-text"} mobile-layout-skeleton"><div class="full-day-tabs">${days.map(() => '<span class="full-day-tab is-skeleton" aria-hidden="true"><span class="mobile-skeleton-line skeleton-loading short"></span></span>').join("")}</div><div class="full-day-tab-content">${createDayPanelSkeleton(4, m === "tabs-pill" ? "tab-pill-day" : "tab-text-day")}</div></div>`;
        } else if (m === "kanban-scroll") {
            h.innerHTML = `<div class="layout-kanban-scroll-wrap mobile-layout-skeleton">${Array.from({ length: 3 }, () => `<section class="kanban-column is-skeleton" aria-hidden="true"><header><h3><span class="mobile-skeleton-line skeleton-loading medium"></span></h3><span class="mobile-skeleton-line skeleton-loading tiny"></span></header><div class="kanban-cards">${Array.from({ length: 4 }, () => createFullCardSkeleton("full-subject-card kanban-card")).join("")}</div></section>`).join("")}</div>`;
        } else if (m === "split-columns") {
            const columnMarkup = () => `<div class="split-column is-skeleton" aria-hidden="true"><h3><span class="mobile-skeleton-line skeleton-loading short"></span></h3>${Array.from({ length: 2 }, () => createDayPanelSkeleton(2, "split-day")).join("")}</div>`;
            h.innerHTML = `<div class="layout-split-columns-wrap mobile-layout-skeleton">${columnMarkup()}${columnMarkup()}</div>`;
        } else if (m === "timeline-stack") {
            h.innerHTML = `<div class="layout-timeline-stack-wrap mobile-layout-skeleton">${Array.from({ length: 3 }, () => `<section class="timeline-day is-skeleton" aria-hidden="true"><header><h3><span class="mobile-skeleton-line skeleton-loading medium"></span></h3></header><div class="timeline-list">${Array.from({ length: 4 }, () => createTimelineSkeleton()).join("")}</div></section>`).join("")}</div>`;
        } else if (m === "day-chips") {
            h.innerHTML = `<div class="layout-day-chips-wrap mobile-layout-skeleton"><div class="day-chips-row">${days.map(() => '<span class="day-chip is-skeleton" aria-hidden="true"><span class="mobile-skeleton-line skeleton-loading short"></span></span>').join("")}</div><div class="day-chips-content">${createDayPanelSkeleton(4, "chips-day")}</div></div>`;
        } else {
            h.innerHTML = `<div class="layout-cards-scroll-wrap mobile-layout-skeleton">${Array.from({ length: 3 }, () => createDayPanelSkeleton()).join("")}</div>`;
        }

        applyRandomSkeletonDelay(h);
    }
    function clearModeClass() {
        modeClasses.forEach((c) => document.body.classList.remove(c));
    }
    function setModeClass(m) {
        clearModeClass();
        const map = {
            "standard-landscape": "layout-standard-landscape",
            "cards-scroll": "layout-cards-scroll",
            "cards-swipe": "layout-cards-swipe",
            accordion: "layout-accordion",
            "tabs-text": "layout-tabs-text",
            "tabs-pill": "layout-tabs-pill",
            "kanban-scroll": "layout-kanban-scroll",
            "kanban-swipe": "layout-kanban-swipe",
            "split-columns": "layout-split-columns",
            "timeline-stack": "layout-timeline-stack",
            "day-chips": "layout-day-chips",
        };
        if (map[m]) document.body.classList.add(map[m]);
    }
    function effectiveMode() {
        const m = mode();
        if (isMobile()) {
            if (
                m === "standard-landscape" &&
                window.matchMedia("(orientation: portrait)").matches
            )
                return "standard";
            return m;
        }
        return m === "split-columns" ? m : "standard";
    }
    function setHeader(m) {
        const t = dom.fullViewHeader?.querySelector(".full-view-title");
        if (!t) return;
        const map = {
            standard: '<i class="fa-solid fa-table-cells"></i> Weekly Schedule',
            "standard-landscape":
                '<i class="fa-solid fa-mobile-screen"></i> Landscape Table',
            "cards-scroll": '<i class="fa-solid fa-id-card"></i> Weekly Cards',
            "cards-swipe": '<i class="fa-solid fa-left-right"></i> Swipe Cards',
            accordion: '<i class="fa-solid fa-list"></i> Accordion Days',
            "tabs-text": '<i class="fa-solid fa-table-list"></i> Text Tabs',
            "tabs-pill": '<i class="fa-solid fa-table-list"></i> Pill Tabs',
            "kanban-scroll": '<i class="fa-solid fa-columns"></i> Kanban Scroll',
            "kanban-swipe":
                '<i class="fa-solid fa-arrows-left-right"></i> Kanban Swipe',
            "split-columns":
                '<i class="fa-solid fa-table-columns"></i> Split Columns',
            "timeline-stack": '<i class="fa-solid fa-stream"></i> Timeline Stack',
            "day-chips": '<i class="fa-solid fa-calendar-week"></i> Day Chips',
        };
        t.innerHTML = map[m] || map.standard;
    }
    function attachSwipe(root) {
        const tr = root.querySelector('[data-swipe-track="1"]');
        if (!tr) return;
        let sx = 0,
            sy = 0;
        tr.addEventListener(
            "touchstart",
            (e) => {
                sx = e.touches[0].clientX;
                sy = e.touches[0].clientY;
            },
            { passive: true },
        );
        tr.addEventListener(
            "touchend",
            (e) => {
                const t = e.changedTouches?.[0];
                if (!t) return;
                const dx = t.clientX - sx,
                    dy = t.clientY - sy;
                if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
                swipe =
                    dx < 0
                        ? (swipe + 1) % days.length
                        : (swipe - 1 + days.length) % days.length;
                renderFull();
            },
            { passive: true },
        );
    }
    function renderFull() {
        syncScheduleFromWindow();
        const h = ensureHost();
        if (!h) return;
        const m = effectiveMode(),
            w = sched ? buildWeek() : null;
        setModeClass(m);
        setHeader(m);

        if (!sched) {
            if (loadFailed) renderFullError(m);
            else renderFullLoading(m);
            void ensureScheduleLoaded().then(async (ok) => {
                await waitForMinimumSkeletonVisibility("full");
                if (!ok && !sched) {
                    clearSkeletonVisible("full");
                    renderFullError(m);
                    return;
                }
                clearSkeletonVisible("full");
                if (!dom.todayView?.classList.contains("active")) renderFull();
            });
            return;
        }

        const tableMode = m === "standard" || m === "standard-landscape";
        if (tableMode) {
            if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
            h.classList.remove("is-loading");
            h.setAttribute("aria-busy", "false");
            h.style.display = "none";
            h.innerHTML = "";
            clearSkeletonVisible("full");
            return;
        }
        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "none";
        h.classList.remove("is-loading");
        h.setAttribute("aria-busy", "false");
        h.style.display = "block";
        clearSkeletonVisible("full");
        if (m === "cards-scroll") h.innerHTML = renderCardsScroll(w);
        else if (m === "cards-swipe") {
            h.innerHTML = renderSwipe(w, "cards-swipe");
            attachSwipe(h);
        } else if (m === "accordion") h.innerHTML = renderAccordion(w);
        else if (m === "tabs-text") h.innerHTML = renderTabs(w, false);
        else if (m === "tabs-pill") h.innerHTML = renderTabs(w, true);
        else if (m === "kanban-scroll") h.innerHTML = renderKanbanScroll(w);
        else if (m === "kanban-swipe") {
            h.innerHTML = renderSwipe(w, "kanban-swipe");
            attachSwipe(h);
        } else if (m === "split-columns") h.innerHTML = renderSplit(w);
        else if (m === "timeline-stack") h.innerHTML = renderTimeline(w);
        else if (m === "day-chips") h.innerHTML = renderChips(w);
        else {
            if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
            h.style.display = "none";
            h.innerHTML = "";
        }
    }
    function onHostClick(e) {
        const card = e.target.closest('[data-subject-card="1"]');
        if (card) {
            const m = getAdv().interactionMode || "link";
            if (m === "mark") {
                card.classList.toggle("marked-subject");
            } else {
                const s = nsub(card.getAttribute("data-subject-name") || "");
                const f = manualMap[s] || manualMap[s.split(" ")[0]];
                const fallback = f || `https://manuale.edu.ro/?s=${encodeURIComponent(s)}`;
                if (window.openManualForSubject) {
                    void window.openManualForSubject(s, fallback);
                } else {
                    window.open(fallback, "_blank");
                }
            }
            return;
        }
        const tb = e.target.closest("[data-day-tab]");
        if (tb) {
            tab = tb.getAttribute("data-day-tab") || "monday";
            renderFull();
            return;
        }
        const cb = e.target.closest("[data-day-chip]");
        if (cb) {
            chips = cb.getAttribute("data-day-chip") || "monday";
            renderFull();
            return;
        }
        const dt = e.target.closest("[data-swipe-dot]");
        if (dt) {
            const i = Number(dt.getAttribute("data-swipe-dot"));
            if (!Number.isNaN(i)) {
                swipe = Math.max(0, Math.min(days.length - 1, i));
                renderFull();
            }
            return;
        }
        if (e.target.closest('[data-swipe-prev="1"]')) {
            swipe = (swipe - 1 + days.length) % days.length;
            renderFull();
            return;
        }
        if (e.target.closest('[data-swipe-next="1"]')) {
            swipe = (swipe + 1) % days.length;
            renderFull();
        }
    }
    function fillToday() {
        if (!dom.todayCards || !dom.todayDate) return;
        syncScheduleFromWindow();
        const n = now();
        dom.todayDate.textContent = fDate(new Date());
        
        // Save marked cards before clearing
        const markedCards = new Set();
        dom.todayCards.querySelectorAll(".today-card.marked-subject").forEach((card) => {
            const periodEl = card.querySelector(".period");
            if (periodEl) {
                markedCards.add(periodEl.textContent.trim());
            }
        });
        
        dom.todayCards.innerHTML = "";
        if (!sched) {
            if (loadFailed) {
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
                if (!ok && !sched) {
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
        const dk = dayMap[n.day];
        if (!dk) {
            hideMobileRecommendedManual();
            dom.todayCards.style.display = "none";
            dom.todayCards.setAttribute("aria-busy", "false");
            setTodayEmptyState("No classes today!", "fa-solid fa-umbrella-beach");
            return;
        }
        const td = buildWeek()[dk] || [];
        if (!td.length) {
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
        td.forEach((c, i) => {
            const el = document.createElement("div");
            const periodLabel = `Period ${c.period}`;
            el.className = `today-card ${c.status}${markedCards.has(periodLabel) ? " marked-subject" : ""}`;
            el.style.animationDelay = `${i * 0.05}s`;
            el.innerHTML = `<div class="today-card-time"><div class="time">${c.time}</div><div class="period">${periodLabel}</div></div><div class="today-card-emoji">${c.emoji}</div><div class="today-card-subject">${c.subject}</div>`;
            el.addEventListener("click", () => {
                const m = getAdv().interactionMode || "link";
                if (m === "mark") {
                    el.classList.toggle("marked-subject");
                } else {
                    const s = nsub(c.subject);
                    const f = manualMap[s] || manualMap[s.split(" ")[0]];
                    const fallback = f || `https://manuale.edu.ro/?s=${encodeURIComponent(s)}`;
                    if (window.openManualForSubject) {
                        void window.openManualForSubject(s, fallback);
                    } else {
                        window.open(fallback, "_blank");
                    }
                }
            });
            dom.todayCards.appendChild(el);
        });
    }
    function showToday() {
        if (!dom.todayView) return;
        dom.navToday?.classList.add("active");
        dom.navFull?.classList.remove("active");
        dom.todayView.classList.add("active");
        if (isMobile()) {
            dom.timetableWrapper && (dom.timetableWrapper.style.display = "none");
            ensureHost() && (ensureHost().style.display = "none");
        }
        fillToday();
    }
    function showFull() {
        if (!dom.todayView) return;
        dom.navFull?.classList.add("active");
        dom.navToday?.classList.remove("active");
        dom.todayView.classList.remove("active");
        renderFull();
    }
    function openSheet() {
        if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
        dom.bottomSheet.classList.add("active");
        dom.bottomSheetOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }
    function closeSheet() {
        if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
        dom.bottomSheet.classList.remove("active");
        dom.bottomSheetOverlay.classList.remove("active");
        document.body.style.overflow = "";
    }
    function trig(type) {
        closeSheet();
        const map = {
            customization: "customizationBtn",
            weather: "weatherBtn",
            textbooks: "allManualsBtn",
            clock: "clockBtn",
            tasks: "todoBtn",
            info: "infoBtn",
        };
        document.getElementById(map[type] || "")?.click();
    }
    function upShortcuts() {
        const s = getAdv(),
            a = shortcuts[s.shortcut1] ? s.shortcut1 : "customization",
            b = shortcuts[s.shortcut2] ? s.shortcut2 : "weather";
        if (dom.navShortcut1) {
            const [i, l] = shortcuts[a];
            dom.navShortcut1.querySelector("i").className = i;
            dom.navShortcut1.querySelector("span").textContent = l;
            dom.navShortcut1.dataset.shortcutType = a;
        }
        if (dom.navShortcut2) {
            const [i, l] = shortcuts[b];
            dom.navShortcut2.querySelector("i").className = i;
            dom.navShortcut2.querySelector("span").textContent = l;
            dom.navShortcut2.dataset.shortcutType = b;
        }
        syncWeather();
    }
    function syncWeather() {
        const me = $("#menuWeatherEmoji"),
            mt = $("#menuWeatherTemp"),
            se = $("#sheetWeatherEmoji"),
            st = $("#sheetWeatherTemp");
        if (me && se) se.textContent = me.textContent;
        if (mt && st) st.textContent = mt.textContent;
        [dom.navShortcut1, dom.navShortcut2].forEach((btn) => {
            if (!btn || btn.dataset.shortcutType !== "weather") return;
            const i = btn.querySelector("i"),
                s = btn.querySelector("span");
            if (me && me.textContent !== "?" && me.textContent !== "??") {
                if (i) {
                    i.className = "";
                    i.textContent = me.textContent;
                    i.style.fontStyle = "normal";
                    i.style.fontSize = "1.3rem";
                }
                if (s && mt && mt.textContent !== "--�C")
                    s.textContent = mt.textContent;
            }
        });
    }
    function upHeader() {
        if (!dom.mobileHeaderTime || !dom.mobileHeaderDate) return;
        const d = new Date(),
            h = String(d.getHours()).padStart(2, "0"),
            m = String(d.getMinutes()).padStart(2, "0");
        dom.mobileHeaderTime.textContent = `${h}:${m}`;
        dom.mobileHeaderDate.textContent = d.toLocaleDateString("ro-RO", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    }
    let last = 0;
    function onScroll() {
        if (!document.body.classList.contains("mobile-nav-scroll")) {
            dom.bottomNavbar && (dom.bottomNavbar.style.transform = "");
            return;
        }
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > last && st > 100) {
            dom.bottomNavbar &&
                (dom.bottomNavbar.style.transform = "translateY(100%)");
        } else {
            dom.bottomNavbar && (dom.bottomNavbar.style.transform = "translateY(0)");
        }
        last = st <= 0 ? 0 : st;
    }
    function onModeChange() {
        if (dom.todayView?.classList.contains("active") && isMobile()) return;
        renderFull();
    }
    function bind() {
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
        dom.sheetCustomizationBtn?.addEventListener("click", () =>
            trig("customization"),
        );
        dom.sheetWeatherBtn?.addEventListener("click", () => trig("weather"));
        dom.sheetManualsBtn?.addEventListener("click", () => trig("textbooks"));
        dom.sheetClockBtn?.addEventListener("click", () => trig("clock"));
        dom.sheetTodoBtn?.addEventListener("click", () => trig("tasks"));
        dom.sheetInfoBtn?.addEventListener("click", () => trig("info"));
        let sy = 0;
        dom.bottomSheet?.addEventListener(
            "touchstart",
            (e) => {
                sy = e.touches[0].clientY;
            },
            { passive: true },
        );
        dom.bottomSheet?.addEventListener(
            "touchmove",
            (e) => {
                if (e.touches[0].clientY - sy > 50) closeSheet();
            },
            { passive: true },
        );
        const obs = new MutationObserver(syncWeather);
        const me = $("#menuWeatherEmoji");
        if (me)
            obs.observe(me, { characterData: true, childList: true, subtree: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) showFull();
            else if (!dom.todayView?.classList.contains("active")) renderFull();
        });
        window.addEventListener("fullLayoutModeChanged", onModeChange);
        window.addEventListener("storage", (e) => {
            if (e.key === UI_KEY) onModeChange();
        });
    }
    function init() {
        const tk = todayKey(),
            i = days.findIndex((d) => d.k === tk);
        if (i >= 0) {
            swipe = i;
            tab = tk;
            chips = tk;
        }
        ensureHost();
        upShortcuts();
        syncWeather();
        upHeader();
        setInterval(upHeader, 1000);
        if (isMobile()) showToday();
        else showFull();
        void ensureScheduleLoaded();
        setInterval(() => {
            week = null;
            if (dom.todayView?.classList.contains("active")) fillToday();
            else renderFull();
        }, 30000);
    }
    bind();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            init();
        });
    } else {
        init();
    }
    window.mobileNav = {
        showTodayView: showToday,
        showFullView: showFull,
        openBottomSheet: openSheet,
        closeBottomSheet: closeSheet,
        updateShortcutButtons: upShortcuts,
        renderFullLayout: renderFull,
    };
})();
