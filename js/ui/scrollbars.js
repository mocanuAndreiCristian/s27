import { onReady } from "../core/dom.js";

export function initializeCustomScrollbars() {
    if (!window.OverlayScrollbarsGlobal) return;

    const { OverlayScrollbars } = window.OverlayScrollbarsGlobal;
    const defaultOptions = {
        scrollbars: {
            autoHide: "leave",
            clickScroll: true,
            theme: "os-theme-custom",
        },
    };

    OverlayScrollbars(document.body, defaultOptions);

    [
        ".todo-sidebar",
        ".list-view",
        ".calendar-view",
        ".info-content",
        ".custom-sidebar",
        ".custom-content",
        ".weather-overlay-container",
        ".task-edit-content",
        ".folder-edit-content",
        ".library-container",
    ].forEach((selector) => {
        const element = document.querySelector(selector);
        if (element) OverlayScrollbars(element, defaultOptions);
    });
}

onReady(initializeCustomScrollbars);

