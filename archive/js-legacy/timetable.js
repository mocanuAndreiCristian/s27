/* ========================================
   TIMETABLE LOGIC: Highlighting & Interaction
   ======================================== */

/* --- DATA LOADING & TABLE GENERATION --- */
let timetableData = null;
let manualMap = {};
const TIMETABLE_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const TIMETABLE_SKELETON_ROWS = 7;
const MIN_SKELETON_VISIBLE_MS = 430;
let highlightIntervalId = null;
let skeletonShownAt = 0;

function getNow() {
    return window.performance?.now ? window.performance.now() : Date.now();
}

function applyRandomSkeletonDelay(root) {
    if (!root) return;

    root.querySelectorAll(".skeleton-loading").forEach((el) => {
        const delay = 0.43 + Math.random() * (0.71 - 0.43);
        el.style.animationDelay = `${delay.toFixed(3)}s`;
    });
}

async function loadTimetableData() {
    renderTimetableSkeleton();

    try {
        const [ttResponse, manualResponse] = await Promise.all([
            fetch(`${dataPath}${classId}.json`),
            fetch(`${dataPath}manuals.json`)
        ]);

        if (!ttResponse.ok || !manualResponse.ok) {
            throw new Error("Failed to load timetable resources.");
        }
        
        timetableData = await ttResponse.json();
        window.timetableData = timetableData;
        const manuals = await manualResponse.json();
        manualMap = {};
        
        // Build manual map for quick access
        manuals.forEach(m => {
            if (m.subject) {
                // New format: resources array
                if (Array.isArray(m.resources) && m.resources.length > 0) {
                    manualMap[m.subject.toLowerCase()] = m.resources[0].link;
                }
                // Legacy format: direct link
                else if (m.link) {
                    manualMap[m.subject.toLowerCase()] = m.link;
                }
            }
        });

        await waitForMinimumSkeletonVisibility();
        renderTimetable();
        setupSubjectHighlight();
        startHighlightLoop(); // Start highlighting loop after data is loaded
    } catch (error) {
        timetableData = null;
        window.timetableData = null;
        manualMap = {};
        console.error("Error loading timetable data:", error);
        await waitForMinimumSkeletonVisibility();
        renderTimetableError();
    } finally {
        setTimetableLoadingState(false);
    }
}

function getTimetableElements() {
    const table = document.getElementById("timetable");
    const wrapper = table?.closest(".timetable-wrapper") || null;
    const tbody = table?.querySelector("tbody") || null;
    return { table, wrapper, tbody };
}

function setTimetableLoadingState(isLoading) {
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

function waitForMinimumSkeletonVisibility() {
    if (!skeletonShownAt) return Promise.resolve();

    const elapsed = getNow() - skeletonShownAt;
    const remaining = Math.max(0, MIN_SKELETON_VISIBLE_MS - elapsed);
    if (!remaining) return Promise.resolve();

    return new Promise((resolve) => {
        window.setTimeout(resolve, remaining);
    });
}

function renderTimetableSkeleton(rowCount = TIMETABLE_SKELETON_ROWS) {
    const { table, wrapper, tbody } = getTimetableElements();
    if (!table || !tbody) return;

    table.classList.remove("has-error");
    if (wrapper) wrapper.classList.remove("has-error");
    setTimetableLoadingState(true);
    skeletonShownAt = getNow();
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

function renderTimetableError(message = "Unable to load the timetable right now.") {
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

function renderTimetable() {
    const { table, wrapper, tbody } = getTimetableElements();
    if (!table || !tbody || !timetableData) return;

    table.classList.remove("has-error");
    if (wrapper) wrapper.classList.remove("has-error");
    tbody.innerHTML = "";

    try {
        // Track which columns have active rowspan
        let rowspanActive = {};

        timetableData.schedule.forEach(row => {
            const tr = document.createElement("tr");
            
            // Time cell
            const timeTh = document.createElement("th");
            timeTh.style.width = "10rem";
            timeTh.textContent = row.time;
            tr.appendChild(timeTh);

            const newRowspanActive = {};

            // Days
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day, dayIdx) => {
                // Skip if this column is covered by a rowspan from previous row
                if (rowspanActive[dayIdx]) {
                    rowspanActive[dayIdx]--;
                    return;
                }

                const subject = row[day];
                const td = document.createElement("th"); // Using <th> as per original structure
                
                // Set tabIndex for keyboard navigation
                td.tabIndex = -1;

                
                if (subject) {
    let content = "";

    // Add emoji or flag FIRST
    if (subject.flag) {
        content += `<span class="${subject.flag}" id="emojis"></span> `;
    } else if (subject.emoji) {
        content += `<span id="emojis">${subject.emoji}</span> `;
    }

    // Then add subject name
    content += subject.name;

    td.innerHTML = content;

    // Apply rowspan attribute if present
    if (subject.rowspan && subject.rowspan > 1) {
        td.rowSpan = subject.rowspan;
        newRowspanActive[dayIdx] = subject.rowspan - 1;
    }
} else {
    // Empty cell
    td.classList.add("no-hover");
}
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
            // Update rowspan tracking for next row
            rowspanActive = newRowspanActive;
        });
    } catch (error) {
        console.error("Error rendering timetable:", error);
        tbody.innerHTML = '<tr><th colspan="6" class="no-hover">Error rendering timetable: ' + error.message + '</th></tr>';
        table.classList.add("has-error");
        if (wrapper) wrapper.classList.add("has-error");
    }

    setTimetableLoadingState(false);
}

function highlightCurrent() {
    if (!timetableData) return;
    const devOverride = window.getDevTimeOverride?.();
    const devDayOverride = window.getDevDayOverride?.();
    const date = devOverride || new Date();
    const dayOfWeek = devDayOverride !== null ? devDayOverride : date.getDay(); // 0=Sunday, 1=Monday...
    const currentMinutes = date.getHours() * 60 + date.getMinutes();

    const table = document.getElementById("timetable");
    if (!table) return;

    // Remove any previous highlights within this table only
    const prev = table.querySelectorAll(".current-day, .current-hour, .current-cell, .current-highlight");
    if (prev.length) prev.forEach(el => el.classList.remove("current-day", "current-hour", "current-cell", "current-highlight"));

    // Only highlight on weekdays (Mon-Fri = 1-5)
    if (dayOfWeek < 1 || dayOfWeek > 5) return;

    // Highlight day header (time column is index 0)
    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
        const headerCells = headerRow.querySelectorAll("th");
        const dayIndex = dayOfWeek; // maps Monday=1 -> headerCells[1]
        if (headerCells[dayIndex]) headerCells[dayIndex].classList.add("current-day", "current-highlight");
    }

    // Find and highlight the current class row + cell (first match only)
    const rows = table.querySelectorAll("tbody tr");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const timeCell = row.cells[0];
        if (!timeCell) continue;
        const m = timeCell.textContent.trim().match(/^(\d{1,2}):(\d{2})/);
        if (!m) continue;
        const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        // Use the same time window logic as recommended manuals: 10 minutes before + 50 minutes after
        const windowStart = start - 10;
        const windowEnd = start + 50;
        if (currentMinutes >= windowStart && currentMinutes < windowEnd) {
            // highlight hour cell and subject cell, and add a generic current-highlight tag so themes can target it
            timeCell.classList.add("current-hour", "current-highlight");
            const subjectCell = row.cells[dayOfWeek];
            if (subjectCell) subjectCell.classList.add("current-cell", "current-highlight");
            // Also mark the header (day) with highlight for consistency
            if (headerRow) {
                const headerCells = headerRow.querySelectorAll("th");
                const dayIndex = dayOfWeek; // Monday=1 -> headerCells[1]
                if (headerCells[dayIndex]) headerCells[dayIndex].classList.add("current-highlight");
            }
            break; // only one row should be current
        }
    }
}

function setupSubjectHighlight() {
    const table = document.getElementById("timetable");
    if (!table) return;
    const items = table.querySelectorAll("tbody tr th:not(:first-child)");
    items.forEach(cell => {
        if (cell.textContent.trim()) {
            cell.classList.add("subject");
        }
    });
}

function startHighlightLoop() {
    highlightCurrent(); // Run immediately on load
    if (highlightIntervalId) clearInterval(highlightIntervalId);
    highlightIntervalId = setInterval(highlightCurrent, 10000);
}

// Initialize
loadTimetableData();

window.showTimetableSkeleton = renderTimetableSkeleton;
window.showTimetableError = renderTimetableError;


/* --- CELL INTERACTION (Click & Keyboard) --- */
(function () {
    const table = document.getElementById("timetable");
    if (!table) return;

    function normalizeSubject(text) {
        if (!text) return "";
        const withoutEmojis = text.replace(
            /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu, ""
        );
        return withoutEmojis.replace(/[^0-9\p{L}\s\-]+/gu, "").trim().toLowerCase();
    }

    function openManual(url) {
        if (!url) return;
        window.open(url, "_blank");
    }

    let selected = { r: -1, c: -1 };

    function getMatrix() {
        return Array.from(table.querySelectorAll("tbody tr")).map(row => 
            Array.from(row.querySelectorAll("th")).slice(1)
        );
    }

    function clearSelection() {
        table.querySelectorAll(".selected").forEach((el) => {
            el.classList.remove("selected");
            el.removeAttribute("aria-selected");
            el.tabIndex = -1;
        });
        selected = { r: -1, c: -1 };
    }

    function selectCell(cell) {
        if (!cell) return;
        const matrix = getMatrix();
        for (let r = 0; r < matrix.length; r++) {
            const c = matrix[r].indexOf(cell);
            if (c !== -1) {
                clearSelection();
                selected = { r, c };
                cell.classList.add("selected");
                cell.setAttribute("aria-selected", "true");
                cell.tabIndex = 0;
                cell.focus({ preventScroll: true });
                return;
            }
        }
    }

    // Get interaction mode from localStorage
    function getInteractionMode() {
        try {
            const settings = JSON.parse(localStorage.getItem('advancedSettings') || '{}');
            return settings.interactionMode || 'link';
        } catch {
            return 'link';
        }
    }

    // Click: based on interaction mode - open link OR mark/unmark
    table.addEventListener("click", function (ev) {
        const cell = ev.target.closest("th, td");
        if (!cell || !table.contains(cell)) return;
        
        // Ensure it's in tbody and not time column
        const tbody = table.querySelector("tbody");
        if (!tbody.contains(cell)) return;
        const tr = cell.parentElement;
        if (cell === tr.cells[0]) return;

        const mode = getInteractionMode();
        const subjText = cell.innerText || cell.textContent;
        const subject = normalizeSubject(subjText);
        if (!subject) return;

        if (mode === 'mark') {
            const isMarked = cell.getAttribute("data-marked") === "true";
            if (!isMarked) {
                cell.innerHTML = "<mark>" + cell.innerHTML + "</mark>";
                cell.setAttribute("data-marked", "true");
            } else {
                cell.innerHTML = cell.innerHTML.replace(/<\/?mark>/g, "");
                cell.setAttribute("data-marked", "false");
            }
        } else {
            const found = manualMap[subject] || manualMap[subject.split(' ')[0]];
            const fallback = found || "https://manuale.edu.ro/?s=" + encodeURIComponent(subject);
            if (window.openManualForSubject) {
                void window.openManualForSubject(subject, fallback);
            } else {
                openManual(fallback);
            }
        }
    }, true);

    // Keyboard navigation
    document.addEventListener("keydown", function (ev) {
        const matrix = getMatrix();
        const rowCount = matrix.length;
        const colCount = matrix[0] ? matrix[0].length : 0;
        
        if ((ev.key.startsWith("Arrow")) && selected.r === -1) {
            let start = null;
            outer: for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    start = { r, c };
                    break outer;
                }
            }
            if (start) selectCell(matrix[start.r][start.c]);
        }

        if (selected.r === -1) return;

        switch (ev.key) {
            case "ArrowRight":
                ev.preventDefault();
                selected.c = (selected.c + 1) % colCount;
                selectCell(matrix[selected.r][selected.c]);
                break;
            case "ArrowLeft":
                ev.preventDefault();
                selected.c = (selected.c - 1 + colCount) % colCount;
                selectCell(matrix[selected.r][selected.c]);
                break;
            case "ArrowDown":
                ev.preventDefault();
                selected.r = (selected.r + 1) % rowCount;
                if (selected.c >= matrix[selected.r].length)
                    selected.c = matrix[selected.r].length - 1;
                selectCell(matrix[selected.r][selected.c]);
                break;
            case "ArrowUp":
                ev.preventDefault();
                selected.r = (selected.r - 1 + rowCount) % rowCount;
                if (selected.c >= matrix[selected.r].length)
                    selected.c = matrix[selected.r].length - 1;
                selectCell(matrix[selected.r][selected.c]);
                break;
            case "Enter":
                ev.preventDefault();
                const activeCell = matrix[selected.r][selected.c];
                if (!activeCell) return;
                const isMarked = activeCell.getAttribute("data-marked") === "true";
                if (!isMarked) {
                    activeCell.innerHTML = "<mark>" + activeCell.innerHTML + "</mark>";
                    activeCell.setAttribute("data-marked", "true");
                } else {
                    activeCell.innerHTML = activeCell.innerHTML.replace(/<\/?mark>/g, "");
                    activeCell.setAttribute("data-marked", "false");
                }
                break;
        }
    });
})();
