import { getAppConfig, getClassDataUrl, getDataUrl, installConfigGlobals, setAppConfig } from "./config.js";
import { createEventBus, emitAppEvent, onAppEvent } from "./events.js";
import { $, $$, byId, createElement, onReady } from "./dom.js";
import { fetchJson, loadClassSchedule, loadManuals, loadThemes } from "./data-service.js";
import { readJson, readStorage, removeStorage, STORAGE_KEYS, writeJson, writeStorage } from "./storage.js";
import { getDevDayOverride, getDevTimeOverride, getEffectiveDate, getEffectiveDayOfWeek, nowMillis, parseClockTimeToMinutes } from "./time.js";
import { escapeHtml, normalizeText, stripEmoji, stripHtml } from "./text.js";
import { getAccessibleTextColor, getRelativeLuminance, hexToRgb, normalizeHexColor } from "./color.js";

export function installLegacyGlobals(global = window) {
    const config = installConfigGlobals();
    const eventBus = global.eventBus || createEventBus();

    global.eventBus = eventBus;
    global.AppCore = {
        config,
        getConfig: getAppConfig,
        setConfig: setAppConfig,
        getDataUrl,
        getClassDataUrl,
        fetchJson,
        loadClassSchedule,
        loadManuals,
        loadThemes,
        emit: emitAppEvent,
        on: onAppEvent,
        eventBus,
        storage: {
            keys: STORAGE_KEYS,
            read: readStorage,
            write: writeStorage,
            remove: removeStorage,
            readJson,
            writeJson,
        },
        dom: {
            $,
            $$,
            byId,
            createElement,
            onReady,
        },
        time: {
            nowMillis,
            getDevTimeOverride,
            getDevDayOverride,
            getEffectiveDate,
            getEffectiveDayOfWeek,
            parseClockTimeToMinutes,
        },
        text: {
            escapeHtml,
            normalizeText,
            stripEmoji,
            stripHtml,
        },
        color: {
            getAccessibleTextColor,
            getRelativeLuminance,
            hexToRgb,
            normalizeHexColor,
        },
    };

    return global.AppCore;
}

installLegacyGlobals();

