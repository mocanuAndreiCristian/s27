import { onAppEvent } from "../core/events.js";
import { onReady } from "../core/dom.js";
import { overlayManager } from "../overlays/overlay-manager.js";
import { addCustomManual, getManualsCatalog, removeCustomManual } from "../manuals/manuals-store.js";
import { openManualEntry } from "../manuals/manual-actions.js";
import { closeSheet } from "../mobile/bottom-sheet.js";
import {
    clearAddManualForm,
    renderLibraryCards,
    setAddManualStatus,
    setLibraryStatus,
    syncAddManualFormVisibility,
} from "./library-view.js";

let currentSort = "az";
let currentSearch = "";
let currentType = "all";

function getManualById(manualId = "") {
    return getManualsCatalog().find((manual) => manual.id === manualId) || null;
}

function getFiltered() {
    const q = currentSearch.trim().toLowerCase();
    let list = getManualsCatalog().slice();

    if (q) {
        list = list.filter(
            (manual) =>
                manual.title.toLowerCase().includes(q) ||
                (manual.subject || "").toLowerCase().includes(q),
        );
    }

    if (currentType !== "all") {
        list = list.filter((manual) => (manual.type || "link") === currentType);
    }

    list.sort((left, right) => {
        const cmp = left.title.localeCompare(right.title, "ro", { sensitivity: "base" });
        return currentSort === "az" ? cmp : -cmp;
    });

    return list;
}

function renderCards() {
    renderLibraryCards(getFiltered());
}

export function openLibraryOverlay() {
    overlayManager.close("sideMenu");
    overlayManager.open("libraryOverlay");
}

function openAddManualOverlay() {
    clearAddManualForm();
    overlayManager.open("libraryAddManualOverlay");
    document.getElementById("libraryAddTitle")?.focus();
}

function closeAddManualOverlay() {
    clearAddManualForm();
    overlayManager.close("libraryAddManualOverlay");
}

function openManualFromGrid(manualId = "") {
    const manual = getManualById(manualId);
    if (!manual) return;
    openManualEntry(manual);
}

function handleDeleteManual(manualId = "") {
    const manual = getManualById(manualId);
    if (!manual || manual.source !== "custom") return;

    const confirmed = window.confirm(`Stergi "${manual.title}" din manualele tale personalizate?`);
    if (!confirmed) return;

    const result = removeCustomManual(manualId);
    if (!result?.ok) {
        setLibraryStatus(result?.error || "Nu am putut sterge manualul.", "error");
        return;
    }

    setLibraryStatus("Manualul personalizat a fost sters.", "success");
    renderCards();
}

function handleSaveManual() {
    const title = String(document.getElementById("libraryAddTitle")?.value || "").trim();
    const subject = String(document.getElementById("libraryAddSubject")?.value || "").trim();
    const type = String(document.getElementById("libraryAddType")?.value || "link").trim();
    const link = String(document.getElementById("libraryAddUrl")?.value || "").trim();
    const image = String(document.getElementById("libraryAddImage")?.value || "").trim();

    const result = addCustomManual({
        title,
        subject,
        type,
        image,
        storageKind: "url",
        link,
    });

    if (!result?.ok) {
        setAddManualStatus(result?.error || "Nu am putut salva manualul.", "error");
        return;
    }

    closeAddManualOverlay();
    setLibraryStatus("Manualul a fost salvat in biblioteca.", "success");
    renderCards();
}

function resetOverlayState() {
    const searchEl = document.getElementById("librarySearch");
    const typeEl = document.getElementById("libraryTypeFilter");
    const body = document.getElementById("libraryBody");

    if (searchEl) searchEl.value = "";
    if (typeEl) typeEl.value = "all";

    currentSearch = "";
    currentType = "all";
    currentSort = "az";

    document.querySelectorAll(".lib-sort-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.sort === "az");
    });

    if (body) body.scrollTop = 0;
    setLibraryStatus("");
    renderCards();
}

export function initLibrary() {
    overlayManager.register("libraryOverlay", {
        closeOnBackdrop: false,
        onOpen: resetOverlayState,
    });

    overlayManager.register("libraryAddManualOverlay");

    document.getElementById("closeLibraryOverlay")?.addEventListener("click", () => {
        overlayManager.close("libraryOverlay");
    });

    document.getElementById("closeLibraryAddManualOverlay")?.addEventListener("click", closeAddManualOverlay);
    document.getElementById("libraryAddCancelBtn")?.addEventListener("click", closeAddManualOverlay);
    document.getElementById("libraryFab")?.addEventListener("click", openAddManualOverlay);

    document.getElementById("libraryAddType")?.addEventListener("change", syncAddManualFormVisibility);

    document.getElementById("libraryAddManualForm")?.addEventListener("submit", (event) => {
        event.preventDefault();
        handleSaveManual();
    });

    document.getElementById("libraryAddManualOverlay")?.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
            closeAddManualOverlay();
        }
    });

    document.getElementById("librarySearch")?.addEventListener("input", (event) => {
        currentSearch = event.target.value;
        renderCards();
    });

    document.getElementById("libraryTypeFilter")?.addEventListener("change", (event) => {
        currentType = event.target.value;
        renderCards();
    });

    document.querySelectorAll(".lib-sort-btn").forEach((button) => {
        button.addEventListener("click", () => {
            document
                .querySelectorAll(".lib-sort-btn")
                .forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            currentSort = button.dataset.sort || "az";
            renderCards();
        });
    });

    document.getElementById("libraryGrid")?.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("[data-delete-manual]");
        if (deleteButton) {
            event.stopPropagation();
            handleDeleteManual(deleteButton.getAttribute("data-delete-manual") || "");
            return;
        }

        const openTarget = event.target.closest("[data-open-manual]");
        if (!openTarget) return;
        openManualFromGrid(openTarget.getAttribute("data-open-manual") || "");
    });

    document.getElementById("libraryGrid")?.addEventListener("keydown", (event) => {
        const card = event.target.closest("[data-open-manual]");
        if (!card || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        openManualFromGrid(card.getAttribute("data-open-manual") || "");
    });

    document.getElementById("libraryBtn")?.addEventListener("click", openLibraryOverlay);

    document.getElementById("sheetLibraryBtn")?.addEventListener("click", () => {
        closeSheet();
        openLibraryOverlay();
    });

    onAppEvent("manuals:updated", () => {
        renderCards();
    });

    syncAddManualFormVisibility();
}

onReady(initLibrary);
onReady(() => openLibraryOverlay());
