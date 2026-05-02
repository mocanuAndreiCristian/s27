import { normalizeText } from "../core/text.js";

export const TIMETABLE_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function getManualEntryUrl(manual = {}) {
    if (Array.isArray(manual.resources) && manual.resources.length > 0) {
        return manual.resources[0]?.link || "";
    }

    return manual.link || "";
}

export function buildManualMap(manuals = []) {
    const nextMap = {};

    manuals.forEach((manual) => {
        if (!manual?.subject) return;

        const link = getManualEntryUrl(manual);
        if (!link) return;

        const rawKey = String(manual.subject).trim().toLowerCase();
        const normalizedKey = normalizeText(manual.subject);
        const firstToken = normalizedKey.split(" ")[0] || "";

        if (rawKey) nextMap[rawKey] = link;
        if (normalizedKey) nextMap[normalizedKey] = link;
        if (firstToken && !nextMap[firstToken]) nextMap[firstToken] = link;
    });

    return nextMap;
}

export function getManualUrlForSubject(manualMap = {}, subject = "") {
    const rawKey = String(subject).trim().toLowerCase();
    const normalizedKey = normalizeText(subject);
    const firstToken = normalizedKey.split(" ")[0] || "";

    return manualMap[rawKey]
        || manualMap[normalizedKey]
        || manualMap[firstToken]
        || "";
}

export function parseTimetableStartMinutes(value = "") {
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
}

export function isSchoolDay(dayOfWeek) {
    return dayOfWeek >= 1 && dayOfWeek <= TIMETABLE_DAYS.length;
}

export function getDayHeaderCellIndex(dayOfWeek) {
    return isSchoolDay(dayOfWeek) ? dayOfWeek : -1;
}
