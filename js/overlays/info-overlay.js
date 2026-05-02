import { byId, onReady } from "../core/dom.js";

export function initInfoOverlay() {
    const menuToggle = byId("menuToggle");
    const infoBtn = byId("infoBtn");
    const closeInfoOverlay = byId("closeInfoOverlay");

    if (window.overlayManager) {
        window.overlayManager.register("sideMenu", {
            closeOnBackdrop: true,
            onOpen: () => {
                if (menuToggle) menuToggle.classList.add("open");
            },
            onClose: () => {
                if (menuToggle) menuToggle.classList.remove("open");
            },
        });

        window.overlayManager.register("infoOverlay", {
            closeOnBackdrop: true,
        });
    }

    menuToggle?.addEventListener("click", () => {
        const sideMenu = byId("sideMenu");
        if (!sideMenu || !window.overlayManager) return;

        if (sideMenu.classList.contains("open")) {
            window.overlayManager.close("sideMenu");
        } else {
            window.overlayManager.open("sideMenu");
        }
    });

    infoBtn?.addEventListener("click", () => {
        if (!window.overlayManager) return;
        window.overlayManager.close("sideMenu");
        window.overlayManager.open("infoOverlay");
    });

    closeInfoOverlay?.addEventListener("click", () => {
        window.overlayManager?.close("infoOverlay");
    });
}

window.updateOverlay = function updateOverlay() {
    // Deprecated: overlay state is managed by OverlayManager.
};

onReady(initInfoOverlay);

