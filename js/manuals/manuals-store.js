import { getAppConfig } from "../core/config.js";
import { getSharedManualsData } from "../core/app-data.js";
import { emitAppEvent } from "../core/events.js";
import { readJson, writeJson } from "../core/storage.js";
import { normalizeText } from "../core/text.js";
import {
    findBestManualForSubject as findBestManualForCatalog,
    findConfiguredSubjectKey as findConfiguredSubjectKeyInMap,
    getConfiguredManualsForSubject as getConfiguredManualsFromCatalog,
    getManualSetForSubject as getManualSetFromCatalog,
} from "./manual-matcher.js";
import {
    CUSTOM_MANUALS_KEY,
    DEFAULT_LIBRARY_SETTINGS,
    UI_KEY,
    clampColumns,
    createId,
    getSaveErrorMessage,
    normalizeCustomManual,
    normalizeManualType,
    normalizeOfficialManual,
    normalizeOpenBehavior,
    sanitizeLibraryManualMap,
    serializeCustomManual,
} from "./manuals-model.js";

let officialManuals = [];
let customManuals = [];
let allManualsData = [];

export function getManualsCatalog() {
    return allManualsData.slice();
}

export function loadCustomManualsFromStorage() {
    const stored = readJson(CUSTOM_MANUALS_KEY, []);
    customManuals = Array.isArray(stored)
        ? stored.map((manual, index) => normalizeCustomManual(manual, index)).filter(Boolean)
        : [];
}

function saveCustomManualsToStorage() {
    try {
        localStorage.setItem(
            CUSTOM_MANUALS_KEY,
            JSON.stringify(customManuals.map(serializeCustomManual)),
        );
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: getSaveErrorMessage(error),
        };
    }
}

export function getLibrarySettings() {
    try {
        const raw = readJson(UI_KEY, {});
        const customTypes = raw.libraryRecommendedCustomTypes && typeof raw.libraryRecommendedCustomTypes === "object"
            ? Object.fromEntries(
                Object.entries(raw.libraryRecommendedCustomTypes).map(([key, value]) => [
                    normalizeText(key),
                    normalizeManualType(value),
                ]),
            )
            : {};

        return {
            libraryPreferredOpenType: normalizeManualType(
                raw.libraryPreferredOpenType,
                DEFAULT_LIBRARY_SETTINGS.libraryPreferredOpenType,
            ),
            libraryDesktopColumns: clampColumns(
                raw.libraryDesktopColumns,
                DEFAULT_LIBRARY_SETTINGS.libraryDesktopColumns,
            ),
            libraryRecommendedOpenBehavior: normalizeOpenBehavior(
                raw.libraryRecommendedOpenBehavior,
                DEFAULT_LIBRARY_SETTINGS.libraryRecommendedOpenBehavior,
            ),
            libraryRecommendedManualMap: sanitizeLibraryManualMap(raw.libraryRecommendedManualMap),
            libraryRecommendedMode: raw.libraryRecommendedMode || DEFAULT_LIBRARY_SETTINGS.libraryRecommendedMode,
            libraryRecommendedCustomTypes: customTypes,
        };
    } catch {
        return { ...DEFAULT_LIBRARY_SETTINGS };
    }
}

export function notifyLibrarySettingsChanged() {
    emitAppEvent("library-settings:updated", {
        settings: getLibrarySettings(),
    });
}

function updateStoredUiSettings(mutator) {
    try {
        const raw = readJson(UI_KEY, {});
        const next = mutator({ ...raw }) || raw;
        const ok = writeJson(UI_KEY, next);
        if (!ok) return { ok: false, error: getSaveErrorMessage() };
        notifyLibrarySettingsChanged();
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: getSaveErrorMessage(error),
        };
    }
}

function removeManualFromStoredSettings(manualId = "") {
    if (!manualId) return;

    updateStoredUiSettings((raw) => {
        const manualMap = sanitizeLibraryManualMap(raw.libraryRecommendedManualMap);
        const nextManualMap = {};

        Object.entries(manualMap).forEach(([subjectKey, manualIds]) => {
            const filtered = manualIds.filter((id) => id !== manualId);
            if (filtered.length) {
                nextManualMap[subjectKey] = filtered;
            }
        });

        return {
            ...raw,
            libraryRecommendedManualMap: nextManualMap,
        };
    });
}

export function refreshCatalog() {
    allManualsData = [...customManuals, ...officialManuals];
    emitAppEvent("manuals:updated", {
        manuals: allManualsData.slice(),
    });
}

export async function loadManualsData() {
    const config = getAppConfig();

    try {
        const data = await getSharedManualsData(config);
        officialManuals = Array.isArray(data)
            ? data
                .map((manual, index) => normalizeOfficialManual(manual, index))
                .flat()
                .filter(Boolean)
            : [];
    } catch (error) {
        officialManuals = [];
        console.error("Error loading manuals data:", error);
    } finally {
        refreshCatalog();
    }
}

export function addCustomManual(input = {}) {
    const manual = normalizeCustomManual(
        {
            id: createId("custom"),
            title: input.title,
            subject: input.subject,
            link: input.link,
            image: input.image,
            type: input.type,
            storageKind: input.storageKind,
            fileDataUrl: input.fileDataUrl,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            addedAt: Date.now(),
        },
        customManuals.length,
    );

    if (!manual) {
        return {
            ok: false,
            error: "Completeaza titlul, materia si o sursa valida pentru manual.",
        };
    }

    customManuals.unshift(manual);
    const saveResult = saveCustomManualsToStorage();
    if (!saveResult.ok) {
        customManuals.shift();
        return saveResult;
    }

    refreshCatalog();

    return {
        ok: true,
        manual,
    };
}

export function removeCustomManual(manualId = "") {
    const targetId = String(manualId);
    const hasManual = customManuals.some((manual) => manual.id === targetId);
    if (!hasManual) {
        return {
            ok: false,
            error: "Manualul personalizat nu mai exista.",
        };
    }

    customManuals = customManuals.filter((manual) => manual.id !== targetId);
    const saveResult = saveCustomManualsToStorage();

    if (!saveResult.ok) {
        loadCustomManualsFromStorage();
        refreshCatalog();
        return saveResult;
    }

    removeManualFromStoredSettings(targetId);
    refreshCatalog();

    return { ok: true };
}

export function findBestManualForSubject(subjectText, options = {}) {
    return findBestManualForCatalog(subjectText, allManualsData, {
        preferredType: normalizeManualType(
            options.preferredType || getLibrarySettings().libraryPreferredOpenType,
        ),
    });
}

export function findConfiguredSubjectKey(subjectText, manualMap) {
    return findConfiguredSubjectKeyInMap(subjectText, manualMap);
}

export function getConfiguredManualsForSubject(subjectText) {
    const settings = getLibrarySettings();
    return getConfiguredManualsFromCatalog(
        subjectText,
        settings.libraryRecommendedManualMap,
        allManualsData,
    );
}

export function getManualSetForSubject(subjectText) {
    return getManualSetFromCatalog(subjectText, allManualsData, getLibrarySettings());
}
