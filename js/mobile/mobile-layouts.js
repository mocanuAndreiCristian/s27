import { $, days, modeClasses, getUI, mode, isMobile, todayKey, fDate, applyRandomSkeletonDelay, markSkeletonVisible, waitForMinimumSkeletonVisibility, clearSkeletonVisible, dom, mobileState, skeletonShownAt, ensureHost } from './mobile-state.js';

export function cards(entries, cls = "full-subject-card") {
    if (!entries.length) return '<div class="full-day-empty">No classes</div>';
    return entries
        .map(
            (e) =>
                `<button type="button" class="${cls}${e.status ? ` ${e.status}` : ""}" data-subject-card="1" data-subject-name="${e.subject}"><div class="full-card-time"><div class="time">${e.time}</div><div class="period">Period ${e.period}</div></div><div class="full-card-emoji">${e.emoji}</div><div class="full-card-subject">${e.subject}</div></button>`,
        )
        .join("");
}

export function panel(d, entries, c = "") {
    return `<section class="full-day-panel ${c}${todayKey() === d.k ? " is-today" : ""}"><header class="full-day-header"><h3>${d.l}</h3><span>${entries.length} classes</span></header><div class="full-day-cards">${cards(entries)}</div></section>`;
}

export function renderCardsScroll(w) {
    return `<div class="layout-cards-scroll-wrap">${days.map((d) => panel(d, w[d.k] || [], "cards-scroll-day")).join("")}</div>`;
}

export function renderAccordion(w) {
    return `<div class="layout-accordion-wrap">${days
        .map((d, i) => {
            const open =
                d.k === todayKey() || (!todayKey() && i === 0) ? " open" : "";
            const en = w[d.k] || [];
            return `<details class="accordion-day"${open}><summary><span>${d.l}</span><span>${en.length} classes</span></summary><div class="accordion-content">${cards(en)}</div></details>`;
        })
        .join("")}</div>`;
}

export function renderTabs(w, pill) {
    const a = w[mobileState.tab] ? mobileState.tab : todayKey() || "monday";
    mobileState.tab = a;
    return `<div class="layout-tabs-wrap ${pill ? "tabs-pill" : "tabs-text"}"><div class="full-day-tabs">${days.map((d) => `<button type="button" class="full-day-tab ${d.k === a ? "active" : ""}" data-day-tab="${d.k}">${d.l}</button>`).join("")}</div><div class="full-day-tab-content">${panel(
        days.find((d) => d.k === a),
        w[a] || [],
        pill ? "tab-pill-day" : "tab-text-day",
    )}</div></div>`;
}

export function renderKanbanScroll(w) {
    return `<div class="layout-kanban-scroll-wrap">${days
        .map((d) => {
            const en = w[d.k] || [];
            return `<section class="kanban-column"><header><h3>${d.l}</h3><span>${en.length}</span></header><div class="kanban-cards">${cards(en, "full-subject-card kanban-card")}</div></section>`;
        })
        .join("")}</div>`;
}

export function renderSwipe(w, variant) {
    const d = days[mobileState.swipe] || days[0],
        en = w[d.k] || [],
        kan = variant === "kanban-swipe";
    return `<div class="${kan ? "layout-kanban-swipe-wrap" : "layout-cards-swipe-wrap"}"><div class="swipe-head"><button type="button" class="swipe-nav" data-swipe-prev="1"><i class="fa-solid fa-chevron-left"></i></button><h3>${d.l}</h3><button type="button" class="swipe-nav" data-swipe-next="1"><i class="fa-solid fa-chevron-right"></i></button></div><div class="swipe-body" data-swipe-track="1">${kan ? `<section class="kanban-column swipe-kanban"><header><h3>${d.l}</h3><span>${en.length}</span></header><div class="kanban-cards">${cards(en, "full-subject-card kanban-card")}</div></section>` : panel(d, en, "swipe-day")}</div><div class="swipe-dots">${days.map((x, i) => `<button type="button" class="swipe-dot ${i === mobileState.swipe ? "active" : ""}" data-swipe-dot="${i}"></button>`).join("")}</div></div>`;
}

export function renderSplit(w) {
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

export function renderTimeline(w) {
    return `<div class="layout-timeline-stack-wrap">${days
        .map((d) => {
            const en = w[d.k] || [];
            if (!en.length)
                return `<section class="timeline-day"><header><h3>${d.l}</h3></header><div class="timeline-empty">No classes</div></section>`;
            return `<section class="timeline-day"><header><h3>${d.l}</h3></header><div class="timeline-list">${en.map((e) => `<button type="button" class="timeline-item ${e.status || ""}" data-subject-card="1" data-subject-name="${e.subject}"><div class="timeline-dot"></div><div class="timeline-main"><div class="timeline-time">${e.time}</div><div class="timeline-subject">${e.subject}</div></div><div class="timeline-emoji">${e.emoji}</div></button>`).join("")}</div></section>`;
        })
        .join("")}</div>`;
}

export function renderChips(w) {
    const a = w[mobileState.chips] ? mobileState.chips : todayKey() || "monday";
    mobileState.chips = a;
    return `<div class="layout-day-chips-wrap"><div class="day-chips-row">${days.map((d) => `<button type="button" class="day-chip ${d.k === a ? "active" : ""}" data-day-chip="${d.k}"><span>${d.s}</span></button>`).join("")}</div><div class="day-chips-content">${panel(
        days.find((d) => d.k === a),
        w[a] || [],
        "chips-day",
    )}</div></div>`;
}

export function setHostBusyState(active) {
    const h = ensureHost();
    if (!h) return null;
    h.classList.toggle("is-loading", active);
    h.setAttribute("aria-busy", active ? "true" : "false");
    return h;
}

export function hideMobileRecommendedManual() {
    const manual = $("#mobileRecommendedManual");
    if (!manual) return;
    manual.classList.remove("active");
    manual.innerHTML = "";
}

export function setTodayEmptyState(message, iconClass) {
    if (!dom.todayEmpty) return;
    const icon = dom.todayEmpty.querySelector("i");
    const text = dom.todayEmpty.querySelector("p");
    if (icon && iconClass) icon.className = iconClass;
    if (text) text.textContent = message;
    dom.todayEmpty.classList.add("active");
}

export function todaySkeletonMarkup(count = 5) {
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

export function renderTodaySkeleton() {
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

export function createFullCardSkeleton(cls = "full-subject-card") {
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

export function createTimelineSkeleton() {
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

export function createDayPanelSkeleton(cardCount = 3, extraClass = "") {
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

export function renderFullError(m) {
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

export function renderFullLoading(m) {
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

export function clearModeClass() {
    modeClasses.forEach((c) => document.body.classList.remove(c));
}

export function setModeClass(m) {
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

export function effectiveMode() {
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

export function setHeader(m) {
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

export function attachSwipe(root, onSwipeChange) {
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
            mobileState.swipe =
                dx < 0
                    ? (mobileState.swipe + 1) % days.length
                    : (mobileState.swipe - 1 + days.length) % days.length;
            onSwipeChange?.();
        },
        { passive: true },
    );
}
