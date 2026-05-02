import { nowMillis } from "../core/time.js";
import { TIMETABLE_DAYS } from "./schedule-utils.js";

export const TIMETABLE_SKELETON_ROWS = 7;
const MIN_SKELETON_VISIBLE_MS = 430;

let skeletonShownAt = 0;

function applyRandomSkeletonDelay(root) {
    if (!root) return;

    root.querySelectorAll(".skeleton-loading").forEach((el) => {
        const delay = 0.43 + Math.random() * (0.71 - 0.43);
        el.style.animationDelay = `${delay.toFixed(3)}s`;
    });
}

export function getTimetableElements() {
    const table = document.getElementById("timetable");
    const wrapper = table?.closest(".timetable-wrapper") || null;
    const tbody = table?.querySelector("tbody") || null;
    return { table, wrapper, tbody };
}

export function setTimetableLoadingState(isLoading) {
    const { table, wrapper } = getTimetableElements();
    if (!table) return;

    table.classList.toggle("is-loading", isLoading);
    table.setAttribute("aria-busy", isLoading ? "true" : "false");

    if (wrapper) {
        wrapper.classList.toggle("is-loading", isLoading);
        wrapper.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    if (!isLoading) {
        skeletonShownAt = 0;
    }
}

export function waitForMinimumSkeletonVisibility() {
    if (!skeletonShownAt) return Promise.resolve();

    const elapsed = nowMillis() - skeletonShownAt;
    const remaining = Math.max(0, MIN_SKELETON_VISIBLE_MS - elapsed);
    if (!remaining) return Promise.resolve();

    return new Promise((resolve) => {
        window.setTimeout(resolve, remaining);
    });
}

export function renderTimetableSkeleton(rowCount = TIMETABLE_SKELETON_ROWS) {
    const { table, wrapper, tbody } = getTimetableElements();
    if (!table || !tbody) return;

    table.classList.remove("has-error");
    if (wrapper) wrapper.classList.remove("has-error");
    setTimetableLoadingState(true);
    skeletonShownAt = nowMillis();
    tbody.innerHTML = "";

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const tr = document.createElement("tr");
        tr.className = "timetable-skeleton-row";
        tr.setAttribute("aria-hidden", "true");

        for (let colIndex = 0; colIndex < TIMETABLE_DAYS.length + 1; colIndex++) {
            const cell = document.createElement("th");
            cell.className = "no-hover timetable-skeleton-cell";

            if (colIndex === 0) {
                cell.classList.add("timetable-skeleton-time");
                cell.style.width = "10rem";
            }

            const block = document.createElement("span");
            block.className = "timetable-skeleton-block skeleton-loading";
            cell.appendChild(block);
            tr.appendChild(cell);
        }

        tbody.appendChild(tr);
    }

    applyRandomSkeletonDelay(tbody);
}

export function renderTimetableError(message = "Unable to load the timetable right now.") {
    const { table, wrapper, tbody } = getTimetableElements();
    if (!table || !tbody) return;

    setTimetableLoadingState(false);
    table.classList.add("has-error");
    if (wrapper) wrapper.classList.add("has-error");
    tbody.innerHTML = `
        <tr class="timetable-message-row">
            <th class="no-hover"></th>
            <th class="timetable-message-cell no-hover" colspan="5">${message}</th>
        </tr>
    `;
}

export function renderTimetable(timetableData) {
    const { table, wrapper, tbody } = getTimetableElements();
    if (!table || !tbody || !timetableData) return;

    table.classList.remove("has-error");
    if (wrapper) wrapper.classList.remove("has-error");
    tbody.innerHTML = "";

    try {
        let rowspanActive = {};

        timetableData.schedule.forEach((row) => {
            const tr = document.createElement("tr");

            const timeTh = document.createElement("th");
            timeTh.style.width = "10rem";
            timeTh.textContent = row.time;
            tr.appendChild(timeTh);

            const newRowspanActive = {};

            TIMETABLE_DAYS.forEach((day, dayIdx) => {
                if (rowspanActive[dayIdx]) {
                    rowspanActive[dayIdx]--;
                    return;
                }

                const subject = row[day];
                const td = document.createElement("th");
                td.tabIndex = -1;

                if (subject) {
                    let content = "";

                    if (subject.flag) {
                        content += `<span class="${subject.flag}" id="emojis"></span> `;
                    } else if (subject.emoji) {
                        content += `<span id="emojis">${subject.emoji}</span> `;
                    }

                    content += subject.name;
                    td.innerHTML = content;

                    if (subject.rowspan && subject.rowspan > 1) {
                        td.rowSpan = subject.rowspan;
                        newRowspanActive[dayIdx] = subject.rowspan - 1;
                    }
                } else {
                    td.classList.add("no-hover");
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
            rowspanActive = newRowspanActive;
        });
    } catch (error) {
        console.error("Error rendering timetable:", error);
        tbody.innerHTML = `<tr><th colspan="6" class="no-hover">Error rendering timetable: ${error.message}</th></tr>`;
        table.classList.add("has-error");
        if (wrapper) wrapper.classList.add("has-error");
    }

    setTimetableLoadingState(false);
}

export function setupSubjectHighlight() {
    const table = document.getElementById("timetable");
    if (!table) return;

    const items = table.querySelectorAll("tbody tr th:not(:first-child)");
    items.forEach((cell) => {
        if (cell.textContent.trim()) {
            cell.classList.add("subject");
        }
    });
}
