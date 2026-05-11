import { getAppConfig } from "../core/config.js";
import { getSharedManualsData, getSharedTimetableData } from "../core/app-data.js";
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
    return timetableData || null;
}

export function getManualUrlForSubject(subject = "") {
    return getManualUrlForLookup(manualMap, subject);
}

export function highlightCurrent() {
    highlightCurrentTable(getTimetableData());
}

export async function loadTimetableData(options = {}) {
    renderTimetableSkeleton();

    try {
        const config = getAppConfig();
        const [scheduleData, manuals] = await Promise.all([
            getSharedTimetableData(config, options),
            getSharedManualsData(config, options),
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
    return {
        renderTimetableSkeleton,
        renderTimetableError,
        loadTimetableData,
        highlightCurrent,
    };
}

export function initTimetable() {
    if (isInitialized) return;

    isInitialized = true;
    installTimetableGlobals();
    onReady(() => {
        void loadTimetableData();
    });
}
