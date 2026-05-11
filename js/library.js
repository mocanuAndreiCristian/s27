/* ========================================
   BIBLIOTECA: Overlay, Cautare, Filtrare, Adaugare
   ======================================== */

(function () {
    "use strict";

    let currentSort = "az";
    let currentSearch = "";
    let currentType = "all";

    const TYPE_META = {
        link: { label: "Link", icon: "fa-solid fa-arrow-up-right-from-square" },
        pdf: { label: "PDF", icon: "fa-solid fa-file-pdf" },
        app: { label: "Aplicatie", icon: "fa-solid fa-mobile-screen" },
    };

    const SOURCE_META = {
        official: { label: "Oficial", className: "lib-source-official" },
        custom: { label: "Personalizat", className: "lib-source-custom" },
    };

    function escapeHtml(value = "") {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getManuals() {
        return window.getManualsCatalog ? window.getManualsCatalog() : [];
    }

    function getManualById(manualId = "") {
        return getManuals().find((manual) => manual.id === manualId) || null;
    }

    function getFiltered() {
        const q = currentSearch.trim().toLowerCase();
        let list = getManuals().slice();

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

    function typeBadge(type) {
        const meta = TYPE_META[type] || TYPE_META.link;
        return `<span class="lib-type-badge lib-type-${type}"><i class="${meta.icon}"></i> ${meta.label}</span>`;
    }

    function sourceBadge(source) {
        const meta = SOURCE_META[source] || SOURCE_META.official;
        return `<span class="lib-source-badge ${meta.className}">${meta.label}</span>`;
    }

    function setLibraryStatus(message = "", tone = "neutral") {
        const status = document.getElementById("libraryStatus");
        if (!status) return;
        status.textContent = message;
        status.dataset.tone = tone;
        status.hidden = !message;
    }

    function setAddManualStatus(message = "", tone = "neutral") {
        const status = document.getElementById("libraryAddStatus");
        if (!status) return;
        status.textContent = message;
        status.dataset.tone = tone;
        status.hidden = !message;
    }

    function syncAddManualFormVisibility() {
        const type = String(document.getElementById("libraryAddType")?.value || "link");
        const urlLabel = document.getElementById("libraryAddUrlLabel");
        const urlInput = document.getElementById("libraryAddUrl");

        if (urlLabel) {
            urlLabel.textContent = type === "app" ? "Link aplicatie" : "Link";
        }

        if (urlInput) {
            urlInput.placeholder = "https://...";
        }
    }

    function clearAddManualForm() {
        [
            "libraryAddTitle",
            "libraryAddSubject",
            "libraryAddUrl",
            "libraryAddImage",
        ].forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = "";
        });

        const typeSelect = document.getElementById("libraryAddType");
        if (typeSelect) {
            typeSelect.value = "link";
        }

        setAddManualStatus("");
    }

    function renderCards() {
        const grid = document.getElementById("libraryGrid");
        const empty = document.getElementById("libraryEmpty");
        const count = document.getElementById("libraryCount");
        if (!grid) return;

        const list = getFiltered();

        if (count) {
            count.textContent = list.length === 1 ? "1 manual" : `${list.length} manuale`;
        }

        if (!list.length) {
            grid.innerHTML = "";
            if (empty) empty.style.display = "flex";
            return;
        }

        if (empty) empty.style.display = "none";

        grid.innerHTML = list
            .map((manual) => {
                const type = manual.type || "link";
                const subject = manual.displaySubject || manual.subject || manual.title;
                const deleteButton =
                    manual.source === "custom"
                        ? `<button class="lib-card-delete-btn" type="button" data-delete-manual="${manual.id}" aria-label="Sterge ${escapeHtml(manual.title)}">
                            <i class="fa-solid fa-trash"></i>
                        </button>`
                        : "";

                return `
                    <article class="lib-card lib-card-type-${type}" tabindex="0" role="button" data-open-manual="${manual.id}" aria-label="Deschide ${escapeHtml(manual.title)}">
                        <div class="lib-card-cover">
                            ${manual.image
                                ? `<img src="${manual.image}" alt="${escapeHtml(manual.title)}" class="lib-card-img" loading="lazy" onerror="this.parentElement.classList.add('no-img')">`
                                : `<div class="lib-card-placeholder"><i class="fa-solid ${type === "pdf" ? "fa-file-pdf" : "fa-book"}"></i></div>`
                            }
                            <div class="lib-card-badges">
                                ${sourceBadge(manual.source)}
                                ${typeBadge(type)}
                            </div>
                            ${deleteButton}
                        </div>
                        <div class="lib-card-body">
                            <span class="lib-card-title">${escapeHtml(manual.title)}</span>
                            <span class="lib-card-subject">${escapeHtml(subject)}</span>
                            <div class="lib-card-actions">
                                <button class="lib-card-open-btn" type="button" data-open-manual="${manual.id}">
                                    Deschide <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    function openLibraryOverlay() {
        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            window.overlayManager.open("libraryOverlay");
        }
    }

    function openAddManualOverlay() {
        clearAddManualForm();
        window.overlayManager?.open("libraryAddManualOverlay");
        document.getElementById("libraryAddTitle")?.focus();
    }

    function closeAddManualOverlay() {
        clearAddManualForm();
        window.overlayManager?.close("libraryAddManualOverlay");
    }

    function openManualFromGrid(manualId = "") {
        const manual = getManualById(manualId);
        if (!manual || !window.openManualEntry) return;
        window.openManualEntry(manual);
    }

    function handleDeleteManual(manualId = "") {
        const manual = getManualById(manualId);
        if (!manual || manual.source !== "custom" || !window.removeCustomManual) return;

        const confirmed = window.confirm(`Stergi "${manual.title}" din manualele tale personalizate?`);
        if (!confirmed) return;

        const result = window.removeCustomManual(manualId);
        if (!result?.ok) {
            setLibraryStatus(result?.error || "Nu am putut sterge manualul.", "error");
            return;
        }

        setLibraryStatus("Manualul personalizat a fost sters.", "success");
        renderCards();
    }

    function handleSaveManual() {
        if (!window.addCustomManual) return;

        const title = String(document.getElementById("libraryAddTitle")?.value || "").trim();
        const subject = String(document.getElementById("libraryAddSubject")?.value || "").trim();
        const type = String(document.getElementById("libraryAddType")?.value || "link").trim();
        const link = String(document.getElementById("libraryAddUrl")?.value || "").trim();
        const image = String(document.getElementById("libraryAddImage")?.value || "").trim();

        const payload = {
            title,
            subject,
            type,
            image,
            storageKind: "url",
            link,
        };

        const result = window.addCustomManual(payload);

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

    window.addEventListener("DOMContentLoaded", () => {
        if (window.overlayManager) {
            window.overlayManager.register("libraryOverlay", {
                closeOnBackdrop: false,
                onOpen: resetOverlayState,
            });

            window.overlayManager.register("libraryAddManualOverlay");
        }

        document.getElementById("closeLibraryOverlay")?.addEventListener("click", () => {
            window.overlayManager?.close("libraryOverlay");
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
            window.mobileNav?.closeBottomSheet();
            openLibraryOverlay();
        });

        window.addEventListener("manuals:updated", () => {
            renderCards();
        });

        syncAddManualFormVisibility();
    });

    window.openLibraryOverlay = openLibraryOverlay;
})();
