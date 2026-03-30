/* ========================================
   UI CORE: Side Menu, Overlays, Info
   ======================================== */

const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const overlay = document.getElementById("overlay");

// Info overlay controls
const infoBtn = document.getElementById("infoBtn");
const infoOverlay = document.getElementById("infoOverlay");
const closeInfoOverlay = document.getElementById("closeInfoOverlay");

// Prevent zoom on double tap (iOS)
let lastTouchEnd = 0;
document.addEventListener(
    "touchend",
    (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    },
    { passive: false }
);

// Register Overlays and Initialize Scrollbars
window.addEventListener("DOMContentLoaded", () => {
    // Initialize Custom Scrollbars (All Devices)
    if (window.OverlayScrollbarsGlobal) {
        const { OverlayScrollbars } = window.OverlayScrollbarsGlobal;
        const defaultOptions = {
            scrollbars: {
                autoHide: 'leave',
                clickScroll: true,
                theme: 'os-theme-custom'
            }
        };

        // Initialize on Body
        OverlayScrollbars(document.body, defaultOptions);

        // Initialize on specific containers
        const scrollContainers = [
            '.todo-sidebar',
            '.list-view',
            '.calendar-view',
            '.info-content',
            '.custom-sidebar',
            '.custom-content',
            '.weather-overlay-container',
            '.task-edit-content',
            '.folder-edit-content',
            '.library-container'
        ];

        scrollContainers.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) OverlayScrollbars(el, defaultOptions);
        });
    }

    // Register Side Menu
    if (window.overlayManager) {
        window.overlayManager.register("sideMenu", {
            closeOnBackdrop: true,
            onOpen: () => {
                if (menuToggle) menuToggle.classList.add("open");
            },
            onClose: () => {
                if (menuToggle) menuToggle.classList.remove("open");
            }
        });

        // Register Info Overlay
        window.overlayManager.register("infoOverlay", {
            closeOnBackdrop: true
        });
    }
});

function updateOverlay() {
    // Deprecated: Handled by OverlayManager
}

// MENU TOGGLE
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        const sideMenu = document.getElementById("sideMenu");
        if (sideMenu.classList.contains("open")) {
            if (window.overlayManager) window.overlayManager.close("sideMenu");
        } else {
            if (window.overlayManager) window.overlayManager.open("sideMenu");
        }
    });
}

// INFO OVERLAY
if (infoBtn) {
    infoBtn.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            window.overlayManager.open("infoOverlay");
        }
    });
}

if (closeInfoOverlay) {
    closeInfoOverlay.addEventListener("click", () => {
        if (window.overlayManager) window.overlayManager.close("infoOverlay");
    });
}

// GLOBAL OVERLAY CLICK (Close top-most layer)
if (overlay) {
    // Managed by OverlayManager
}

/* --- COLLAPSIBLE RELEASE NOTES --- */
(function initReleaseNotesCollapsible() {
    const notes = document.querySelectorAll(".release-note");
    if (!notes || notes.length === 0) return;

    notes.forEach((note) => {
        const header = note.querySelector(".release-header");
        if (!header) return;

        if (!note.querySelector(".release-body")) {
            const body = document.createElement("div");
            body.className = "release-body";
            let sibling = header.nextElementSibling;
            while (sibling) {
                const next = sibling.nextElementSibling;
                body.appendChild(sibling);
                sibling = next;
            }
            note.appendChild(body);
        }

        header.setAttribute("tabindex", "0");
        header.setAttribute("role", "button");
        header.setAttribute("aria-expanded", note.classList.contains("open") ? "true" : "false");

        function closeOtherNotes() {
            document.querySelectorAll(".release-note.open").forEach((n) => {
                if (n !== note) {
                    n.classList.remove("open");
                    const h = n.querySelector(".release-header");
                    if (h) h.setAttribute("aria-expanded", "false");
                }
            });
        }

        function toggleNote() {
            const isOpen = note.classList.contains("open");
            if (isOpen) {
                note.classList.remove("open");
                header.setAttribute("aria-expanded", "false");
            } else {
                closeOtherNotes();
                note.classList.add("open");
                header.setAttribute("aria-expanded", "true");
            }
        }

        header.addEventListener("click", (e) => {
            if (e.target.closest(".preset-card-actions, .preset-card-btn, .close-btn, .fa-trash"))
                return;
            toggleNote();
        });

        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleNote();
            } else if (e.key === "Escape") {
                note.classList.remove("open");
                header.setAttribute("aria-expanded", "false");
            }
        });
    });
})();