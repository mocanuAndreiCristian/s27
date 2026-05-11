import { getAppConfig } from "./config.js";
import { emitAppEvent } from "./events.js";
import { loadClassSchedule, loadManuals, loadThemes } from "./data-service.js";

const timetableCache = new Map();
const manualsCache = new Map();
const themesCache = new Map();

function getTimetableCacheKey(config = getAppConfig()) {
    return `${config.dataPath}::${config.classId}`;
}

function getSharedCacheKey(config = getAppConfig()) {
    return config.dataPath;
}

function getCacheRecord(cache, key) {
    const existing = cache.get(key);
    if (existing) return existing;

    const created = {
        data: null,
        promise: null,
    };
    cache.set(key, created);
    return created;
}

async function resolveCached(cache, key, loader, eventName, meta = {}) {
    const record = getCacheRecord(cache, key);
    if (record.data) return record.data;
    if (record.promise) return record.promise;

    record.promise = loader()
        .then((data) => {
            record.data = data;
            emitAppEvent(eventName, {
                ...meta,
                key,
                data,
            });
            return data;
        })
        .finally(() => {
            record.promise = null;
        });

    return record.promise;
}

export function clearAppDataCache(scope = "all") {
    if (scope === "all" || scope === "timetable") timetableCache.clear();
    if (scope === "all" || scope === "manuals") manualsCache.clear();
    if (scope === "all" || scope === "themes") themesCache.clear();
}

export function getCachedTimetableData(config = getAppConfig()) {
    return timetableCache.get(getTimetableCacheKey(config))?.data || null;
}

export async function getSharedTimetableData(config = getAppConfig(), options = {}) {
    const key = getTimetableCacheKey(config);
    if (options.force) timetableCache.delete(key);

    return resolveCached(
        timetableCache,
        key,
        () => loadClassSchedule(config.classId),
        "app-data:timetable-updated",
        { classId: config.classId, dataPath: config.dataPath },
    );
}

export function getCachedManualsData(config = getAppConfig()) {
    return manualsCache.get(getSharedCacheKey(config))?.data || null;
}

export async function getSharedManualsData(config = getAppConfig(), options = {}) {
    const key = getSharedCacheKey(config);
    if (options.force) manualsCache.delete(key);

    return resolveCached(
        manualsCache,
        key,
        () => loadManuals(),
        "app-data:manuals-updated",
        { dataPath: config.dataPath },
    );
}

export function getCachedThemesData(config = getAppConfig()) {
    return themesCache.get(getSharedCacheKey(config))?.data || null;
}

export async function getSharedThemesData(config = getAppConfig(), options = {}) {
    const key = getSharedCacheKey(config);
    if (options.force) themesCache.delete(key);

    return resolveCached(
        themesCache,
        key,
        () => loadThemes(),
        "app-data:themes-updated",
        { dataPath: config.dataPath },
    );
}
