const DEFAULT_CLASS_ID = "8d";
const DEFAULT_DATA_PATH = "data/";

function normalizePath(path) {
    const value = String(path || DEFAULT_DATA_PATH).trim() || DEFAULT_DATA_PATH;
    return value.endsWith("/") ? value : `${value}/`;
}

function normalizeClassId(classId) {
    return String(classId || DEFAULT_CLASS_ID).trim().toLowerCase() || DEFAULT_CLASS_ID;
}

export function getAppConfig() {
    const source = window.AppConfig || {};

    return {
        classId: normalizeClassId(source.classId || window.CLASS_ID),
        dataPath: normalizePath(source.dataPath || window.DATA_PATH),
    };
}

export function setAppConfig(config = {}) {
    const current = getAppConfig();
    const next = {
        classId: normalizeClassId(config.classId || current.classId),
        dataPath: normalizePath(config.dataPath || current.dataPath),
    };

    window.AppConfig = next;
    window.CLASS_ID = next.classId;
    window.DATA_PATH = next.dataPath;

    return next;
}

export function getDataUrl(fileName = "") {
    const { dataPath } = getAppConfig();
    return `${dataPath}${String(fileName).replace(/^\/+/, "")}`;
}

export function getClassDataUrl(classId = getAppConfig().classId) {
    return getDataUrl(`${normalizeClassId(classId)}.json`);
}

export function installConfigGlobals() {
    const config = setAppConfig(window.AppConfig || {
        classId: window.CLASS_ID,
        dataPath: window.DATA_PATH,
    });

    return config;
}

