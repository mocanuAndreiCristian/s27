import { getAppConfig, getClassDataUrl, getDataUrl } from "./config.js";

export async function fetchJson(url, options) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.json();
}

export function getDataPath() {
    return getAppConfig().dataPath;
}

export async function loadClassSchedule(classId = getAppConfig().classId) {
    return fetchJson(getClassDataUrl(classId));
}

export async function loadManuals() {
    return fetchJson(getDataUrl("manuals.json"));
}

export async function loadThemes() {
    return fetchJson(getDataUrl("themes.json"));
}

