import { normalizeText, stripEmoji } from "../core/text.js";
import { openManualForSubject } from "../manuals/recommended-manuals.js";

let isBound = false;
let selected = { r: -1, c: -1 };

function getTable() {
    return document.getElementById("timetable");
}

function normalizeSubject(text) {
    return normalizeText(stripEmoji(text));
}

function openManual(url) {
    if (!url) return;
    window.open(url, "_blank");
}

function getMatrix(table) {
    return Array.from(table.querySelectorAll("tbody tr")).map((row) =>
        Array.from(row.querySelectorAll("th")).slice(1),
    );
}

function clearSelection(table) {
    table.querySelectorAll(".selected").forEach((el) => {
        el.classList.remove("selected");
        el.removeAttribute("aria-selected");
        el.tabIndex = -1;
    });
    selected = { r: -1, c: -1 };
}

function selectCell(table, cell) {
    if (!cell) return;

    const matrix = getMatrix(table);
    for (let r = 0; r < matrix.length; r++) {
        const c = matrix[r].indexOf(cell);
        if (c !== -1) {
            clearSelection(table);
            selected = { r, c };
            cell.classList.add("selected");
            cell.setAttribute("aria-selected", "true");
            cell.tabIndex = 0;
            cell.focus({ preventScroll: true });
            return;
        }
    }
}

function getInteractionMode() {
    try {
        const settings = JSON.parse(localStorage.getItem("advancedSettings") || "{}");
        return settings.interactionMode || "link";
    } catch {
        return "link";
    }
}

function toggleMarkedCell(cell) {
    const isMarked = cell.getAttribute("data-marked") === "true";
    if (!isMarked) {
        cell.innerHTML = `<mark>${cell.innerHTML}</mark>`;
        cell.setAttribute("data-marked", "true");
    } else {
        cell.innerHTML = cell.innerHTML.replace(/<\/?mark>/g, "");
        cell.setAttribute("data-marked", "false");
    }
}

export function setupTimetableInteractions({ getManualUrlForSubject } = {}) {
    const table = getTable();
    if (!table || isBound) return;

    isBound = true;

    table.addEventListener("click", (event) => {
        const cell = event.target.closest("th, td");
        if (!cell || !table.contains(cell)) return;

        const tbody = table.querySelector("tbody");
        if (!tbody.contains(cell)) return;

        const tr = cell.parentElement;
        if (cell === tr.cells[0]) return;

        const mode = getInteractionMode();
        const subject = normalizeSubject(cell.innerText || cell.textContent);
        if (!subject) return;

        if (mode === "mark") {
            toggleMarkedCell(cell);
            return;
        }

        const fallback = getManualUrlForSubject?.(subject)
            || `https://manuale.edu.ro/?s=${encodeURIComponent(subject)}`;

        openManualForSubject(subject, fallback);
    }, true);

    document.addEventListener("keydown", (event) => {
        const currentTable = getTable();
        if (!currentTable) return;

        const matrix = getMatrix(currentTable);
        const rowCount = matrix.length;
        const colCount = matrix[0] ? matrix[0].length : 0;
        if (!rowCount || !colCount) return;

        if (event.key.startsWith("Arrow") && selected.r === -1) {
            let start = null;
            outer: for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    start = { r, c };
                    break outer;
                }
            }
            if (start) selectCell(currentTable, matrix[start.r][start.c]);
        }

        if (selected.r === -1) return;

        switch (event.key) {
            case "ArrowRight":
                event.preventDefault();
                selected.c = (selected.c + 1) % colCount;
                selectCell(currentTable, matrix[selected.r][selected.c]);
                break;
            case "ArrowLeft":
                event.preventDefault();
                selected.c = (selected.c - 1 + colCount) % colCount;
                selectCell(currentTable, matrix[selected.r][selected.c]);
                break;
            case "ArrowDown":
                event.preventDefault();
                selected.r = (selected.r + 1) % rowCount;
                if (selected.c >= matrix[selected.r].length) {
                    selected.c = matrix[selected.r].length - 1;
                }
                selectCell(currentTable, matrix[selected.r][selected.c]);
                break;
            case "ArrowUp":
                event.preventDefault();
                selected.r = (selected.r - 1 + rowCount) % rowCount;
                if (selected.c >= matrix[selected.r].length) {
                    selected.c = matrix[selected.r].length - 1;
                }
                selectCell(currentTable, matrix[selected.r][selected.c]);
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                if (selected.r >= 0 && matrix[selected.r] && matrix[selected.r][selected.c]) {
                    matrix[selected.r][selected.c].click();
                }
                break;
            case "Escape":
                clearSelection(currentTable);
                break;
            default:
                break;
        }
    });
}

