/* ========================================
   TIMETABLE LOGIC: Highlighting & Interaction
   ======================================== */

/* --- DATA LOADING & TABLE GENERATION --- */
let timetableData = null;
let manualMap = {};

async function loadTimetableData() {
    const dataPath = window.DATA_PATH || 'data/';
    const classId = window.CLASS_ID || '8a';
    try {
        const [ttResponse, manualResponse] = await Promise.all([
            fetch(`${dataPath}${classId}.json`),
            fetch(`${dataPath}manuals.json`)
        ]);
        
        timetableData = await ttResponse.json();
        const manuals = await manualResponse.json();
        
        // Build manual map for quick access
        manuals.forEach(m => {
            if (m.subject) {
                manualMap[m.subject.toLowerCase()] = m.link;
            }
        });

        // Use the new layout system
        if (window.renderSelectedTimetableLayout) {
            window.renderSelectedTimetableLayout(timetableData);
        } else {
            renderTimetable();
        }
        
        setupSubjectHighlight();
        startHighlightLoop(); // Start highlighting loop after data is loaded
    } catch (error) {
        console.error("Error loading timetable data:", error);
    }
}

function renderTimetable() {
    const table = document.getElementById("timetable");
    if (!table || !timetableData) return;

    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    timetableData.schedule.forEach(row => {
        const tr = document.createElement("tr");
        
        // Time cell
        const timeTh = document.createElement("th");
        timeTh.style.width = "10rem";
        timeTh.textContent = row.time;
        tr.appendChild(timeTh);

        // Days
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            const td = document.createElement("th"); // Using <th> as per original structure
            const subject = row[day];
            
            // Set tabIndex for keyboard navigation
            td.tabIndex = -1;

            if (subject) {
                let content = subject.name + " ";
                if (subject.flag) {
                    content += `<span class="${subject.flag}" id="emojis"></span>`;
                } else if (subject.emoji) {
                    content += `<span id="emojis">${subject.emoji}</span>`;
                }
                td.innerHTML = content;
            } else {
                td.classList.add("no-hover");
            }
            
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
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
    const wrapper = document.querySelector('.timetable-wrapper');
    
    // For standard table layout
    if (table) {
        const items = table.querySelectorAll("tbody tr th:not(:first-child)");
        items.forEach(cell => {
            if (cell.textContent.trim()) {
                cell.classList.add("subject");
            }
        });
    }
    
    // For other layouts - add subject class to clickable items
    if (wrapper) {
        const subjects = wrapper.querySelectorAll('.timetable-class-item, .tab-class-item, .accordion-class-subject, .kanban-item, .split-class-slot');
        subjects.forEach(item => {
            if (item.textContent.trim() && !item.textContent.includes('-')) {
                item.classList.add('subject');
            }
        });
    }
}

function startHighlightLoop() {
    highlightCurrent(); // Run immediately on load
    setInterval(highlightCurrent, 10000);
}

// Initialize
loadTimetableData();

// Global: render or delegate timetable layout based on the selector
window.renderSelectedTimetableLayout = function () {
    const selector = document.getElementById('timetableLayoutSelect');
    const layout = selector ? selector.value : 'standard';

    // Inline renderers handled here
    if (layout === 'standard' || layout === 'standard-landscape') {
        // apply body class for landscape modifier
        document.body.classList.toggle('layout-standard-landscape', layout === 'standard-landscape');
        renderTimetable();
        return;
    }
    if (layout === 'cards-scroll') {
        renderTimetableCardScrollable();
        return;
    }
    if (layout === 'kanban-scroll') {
        renderTimetableKanbanScrollable();
        return;
    }

    // Other layouts (swipe, accordion, tabs, split-columns, etc.) are full-layout modes
    // delegate to mobile-nav / full-layout system so behaviour is consistent
    if (window.timetableLayouts && typeof window.timetableLayouts.setLayout === 'function') {
        window.timetableLayouts.setLayout(layout);
        return;
    }

    // fallback
    renderTimetable();
};

// Listen for layout selector changes
document.addEventListener('DOMContentLoaded', function() {
    const selector = document.getElementById('timetableLayoutSelect');
    if (selector) {
        selector.addEventListener('change', function() {
            // trigger the shared renderer
            window.renderSelectedTimetableLayout();
        });
    }
    
    // Listen for layout changes from other components
    window.addEventListener('timetableLayoutChanged', function() {
        if (window.highlightCurrent) window.highlightCurrent();
        // re-render selected layout when external change occurs
        window.renderSelectedTimetableLayout();
    });
});


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
            if (found) {
                openManual(found);
            } else {
                openManual("https://manuale.edu.ro/?s=" + encodeURIComponent(subject));
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

/* --- LAYOUT-AGNOSTIC CELL INTERACTION --- */
(function () {
    // Get interaction mode from localStorage
    function getInteractionMode() {
        try {
            const settings = JSON.parse(localStorage.getItem('advancedSettings') || '{}');
            return settings.interactionMode || 'link';
        } catch {
            return 'link';
        }
    }

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

    // Add interaction to all subject items in non-table layouts
    const wrapper = document.querySelector('.timetable-wrapper');
    if (!wrapper) return;

    // Listen for clicks on all layout items
    wrapper.addEventListener('click', function(ev) {
        const item = ev.target.closest('.timetable-class-item, .tab-class-item, .accordion-class-subject, .kanban-item, .kanban-swipe-item, .split-class-slot, .timetable-swipe-class-item');
        if (!item) return;

        const mode = getInteractionMode();
        const text = item.textContent || item.innerText;
        const subject = normalizeSubject(text);
        
        if (!subject) return;

        if (mode === 'mark') {
            item.classList.toggle('marked-subject');
        } else {
            const found = manualMap[subject] || manualMap[subject.split(' ')[0]];
            if (found) {
                openManual(found);
            } else {
                openManual("https://manuale.edu.ro/?s=" + encodeURIComponent(subject));
            }
        }
    });
})();