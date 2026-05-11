import { getDevDayOverride, getDevTimeOverride } from "../core/time.js";
import { getDayHeaderCellIndex, isSchoolDay, parseTimetableStartMinutes } from "./schedule-utils.js";

export function highlightCurrent(timetableData) {
    if (!timetableData) return;

    const devOverride = getDevTimeOverride();
    const devDayOverride = getDevDayOverride();
    const date = devOverride || new Date();
    const dayOfWeek = devDayOverride !== null ? devDayOverride : date.getDay();
    const currentMinutes = (date.getHours() * 60) + date.getMinutes();

    const table = document.getElementById("timetable");
    if (!table) return;

    const previous = table.querySelectorAll(".current-day, .current-hour, .current-cell, .current-highlight");
    if (previous.length) {
        previous.forEach((el) => el.classList.remove("current-day", "current-hour", "current-cell", "current-highlight"));
    }

    if (!isSchoolDay(dayOfWeek)) return;

    const dayIndex = getDayHeaderCellIndex(dayOfWeek);
    if (dayIndex === -1) return;

    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
        const headerCells = headerRow.querySelectorAll("th");
        if (headerCells[dayIndex]) {
            headerCells[dayIndex].classList.add("current-day", "current-highlight");
        }
    }

    const rows = table.querySelectorAll("tbody tr");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const timeCell = row.cells[0];
        if (!timeCell) continue;

        const start = parseTimetableStartMinutes(timeCell.textContent);
        if (start === null) continue;
        const windowStart = start - 10;
        const windowEnd = start + 50;

        if (currentMinutes >= windowStart && currentMinutes < windowEnd) {
            timeCell.classList.add("current-hour", "current-highlight");
            const subjectCell = row.cells[dayIndex];
            if (subjectCell) subjectCell.classList.add("current-cell", "current-highlight");

            if (headerRow) {
                const headerCells = headerRow.querySelectorAll("th");
                if (headerCells[dayIndex]) headerCells[dayIndex].classList.add("current-highlight");
            }
            break;
        }
    }
}
