import { dom } from './mobile-state.js';

export function openSheet() {
    if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
    dom.bottomSheet.classList.add("active");
    dom.bottomSheetOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

export function closeSheet() {
    if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
    dom.bottomSheet.classList.remove("active");
    dom.bottomSheetOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

export function trig(type) {
    closeSheet();
    const map = {
        customization: "customizationBtn",
        weather: "weatherBtn",
        clock: "clockBtn",
        tasks: "todoBtn",
        info: "infoBtn",
        library: "libraryBtn",
    };
    document.getElementById(map[type] || "")?.click();
}