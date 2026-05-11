import { byId, onReady } from "../core/dom.js";
import { overlayManager } from "./overlay-manager.js";

export function initInfoOverlay() {
    const menuToggle = byId("menuToggle");
    const infoBtn = byId("infoBtn");
    const closeInfoOverlay = byId("closeInfoOverlay");

    overlayManager.register("sideMenu", {
        closeOnBackdrop: true,
        onOpen: () => {
            if (menuToggle) menuToggle.classList.add("open");
        },
        onClose: () => {
            if (menuToggle) menuToggle.classList.remove("open");
        },
    });

    overlayManager.register("infoOverlay", {
        closeOnBackdrop: true,
    });

    menuToggle?.addEventListener("click", () => {
        const sideMenu = byId("sideMenu");
        if (!sideMenu) return;

        if (sideMenu.classList.contains("open")) {
            overlayManager.close("sideMenu");
        } else {
            overlayManager.open("sideMenu");
        }
    });

    infoBtn?.addEventListener("click", () => {
        overlayManager.close("sideMenu");
        overlayManager.open("infoOverlay");
    });

    closeInfoOverlay?.addEventListener("click", () => {
        overlayManager.close("infoOverlay");
    });
}

window.updateOverlay = function updateOverlay() {
    // Deprecated: overlay state is managed by OverlayManager.
};

onReady(initInfoOverlay);

