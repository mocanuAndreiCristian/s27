import { escapeHtml } from "../core/text.js";

const TYPE_META = {
    link: { label: "Link", icon: "fa-solid fa-arrow-up-right-from-square" },
    pdf: { label: "PDF", icon: "fa-solid fa-file-pdf" },
    app: { label: "Aplicatie", icon: "fa-solid fa-mobile-screen" },
};

const SOURCE_META = {
    official: { label: "Oficial", className: "lib-source-official" },
    custom: { label: "Personalizat", className: "lib-source-custom" },
};

function typeBadge(type) {
    const meta = TYPE_META[type] || TYPE_META.link;
    return `<span class="lib-type-badge lib-type-${type}"><i class="${meta.icon}"></i> ${meta.label}</span>`;
}

function sourceBadge(source) {
    const meta = SOURCE_META[source] || SOURCE_META.official;
    return `<span class="lib-source-badge ${meta.className}">${meta.label}</span>`;
}

export function setLibraryStatus(message = "", tone = "neutral") {
    const status = document.getElementById("libraryStatus");
    if (!status) return;

    status.textContent = message;
    status.dataset.tone = tone;
    status.hidden = !message;
}

export function setAddManualStatus(message = "", tone = "neutral") {
    const status = document.getElementById("libraryAddStatus");
    if (!status) return;

    status.textContent = message;
    status.dataset.tone = tone;
    status.hidden = !message;
}

export function syncAddManualFormVisibility() {
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

export function clearAddManualForm() {
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

export function renderLibraryCards(list = []) {
    const grid = document.getElementById("libraryGrid");
    const empty = document.getElementById("libraryEmpty");
    const count = document.getElementById("libraryCount");
    if (!grid) return;

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

