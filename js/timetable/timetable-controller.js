import { getAppConfig } from "../core/config.js";
import { loadClassSchedule, loadManuals } from "../core/data-service.js";
import { onReady } from "../core/dom.js";
import { highlightCurrent as highlightCurrentTable } from "./current-highlight.js";
import { buildManualMap, getManualUrlForSubject as getManualUrlForLookup } from "./schedule-utils.js";
import { setupTimetableInteractions } from "./timetable-interactions.js";
import {
    renderTimetable,
    renderTimetableError,
    renderTimetableSkeleton,
    setTimetableLoadingState,
    setupSubjectHighlight,
    waitForMinimumSkeletonVisibility,
} from "./timetable-renderer.js";

let timetableData = null;
let manualMap = {};
let highlightIntervalId = null;
let isInitialized = false;

function setTimetableData(nextData) {
    timetableData = nextData || null;
    window.timetableData = timetableData;
    return timetableData;
}

function stopHighlightLoop() {
    if (highlightIntervalId) {
        window.clearInterval(highlightIntervalId);
        highlightIntervalId = null;
    }
}

function startHighlightLoop() {
    stopHighlightLoop();
    highlightCurrent();
    highlightIntervalId = window.setInterval(highlightCurrent, 10000);
}

export function getTimetableData() {
    return window.timetableData || timetableData || null;
}

export function getManualUrlForSubject(subject = "") {
    return getManualUrlForLookup(manualMap, subject);
}

export function highlightCurrent() {
    highlightCurrentTable(getTimetableData());
}

export async function loadTimetableData() {
    renderTimetableSkeleton();

    try {
        const { classId } = getAppConfig();
        const [scheduleData, manuals] = await Promise.all([
            loadClassSchedule(classId),
            loadManuals(),
        ]);

        setTimetableData(scheduleData);
        manualMap = buildManualMap(manuals);

        await waitForMinimumSkeletonVisibility();
        renderTimetable(scheduleData);
        setupSubjectHighlight();
        setupTimetableInteractions({ getManualUrlForSubject });
        startHighlightLoop();

        return scheduleData;
    } catch (error) {
        setTimetableData(null);
        manualMap = {};
        stopHighlightLoop();
        console.error("Error loading timetable data:", error);
        await waitForMinimumSkeletonVisibility();
        renderTimetableError();
        return null;
    } finally {
        setTimetableLoadingState(false);
    }
}

export function installTimetableGlobals() {
    window.showTimetableSkeleton = renderTimetableSkeleton;
    window.showTimetableError = renderTimetableError;
    window.loadTimetableData = loadTimetableData;
    window.highlightCurrent = highlightCurrent;
}

export function initTimetable() {
    if (isInitialized) return;

    isInitialized = true;
    installTimetableGlobals();
    onReady(() => {
        void loadTimetableData();
    });
}
