import { STORAGE_KEYS } from "../core/storage.js";
import { normalizeText } from "../core/text.js";

export const UI_KEY = STORAGE_KEYS.UI_SETTINGS;
export const CUSTOM_MANUALS_KEY = STORAGE_KEYS.CUSTOM_MANUALS;
export const RECOMMENDATION_REFRESH_MS = 30000;
export const SEARCH_FALLBACK_URL = "https://manuale.edu.ro/?s=";

const VALID_MANUAL_TYPES = new Set(["link", "pdf", "app"]);
const VALID_STORAGE_KINDS = new Set(["url", "upload"]);
const VALID_OPEN_BEHAVIORS = new Set(["open-all", "buttons", "both"]);

export const DEFAULT_LIBRARY_SETTINGS = {
    libraryPreferredOpenType: "link",
    libraryDesktopColumns: 4,
    libraryRecommendedOpenBehavior: "open-all",
    libraryRecommendedManualMap: {},
    libraryRecommendedMode: "link",
    libraryRecommendedCustomTypes: {},
};

export function titleCase(value = "") {
    const cleaned = String(value).replace(/\s+/g, " ").trim();
    if (!cleaned) return "General";

    return cleaned
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function buildSearchUrl(subject = "") {
    return `${SEARCH_FALLBACK_URL}${encodeURIComponent(subject)}`;
}

export function normalizeManualType(value = "", fallback = "link") {
    return VALID_MANUAL_TYPES.has(value) ? value : fallback;
}

export function normalizeStorageKind(value = "", fallback = "url") {
    return VALID_STORAGE_KINDS.has(value) ? value : fallback;
}

export function normalizeOpenBehavior(value = "", fallback = DEFAULT_LIBRARY_SETTINGS.libraryRecommendedOpenBehavior) {
    return VALID_OPEN_BEHAVIORS.has(value) ? value : fallback;
}

export function clampColumns(value, fallback = 4) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(2, Math.min(6, Math.round(parsed)));
}

export function normalizeManualLink(rawValue = "") {
    const value = String(rawValue).trim();
    if (!value) return "";

    try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) return "";
        return url.toString();
    } catch {
        return "";
    }
}

export function normalizePdfDataUrl(rawValue = "") {
    const value = String(rawValue).trim();
    if (!value) return "";
    if (!value.startsWith("data:application/pdf")) return "";
    return value.includes(";base64,") ? value : "";
}

export function clampFileSize(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function createId(prefix = "manual") {
    if (window.crypto?.randomUUID) {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addSearchMetadata(manual = {}) {
    const title = String(manual.title || "").trim() || "Manual fara titlu";
    const subject = String(manual.subject || "").trim() || title;
    const type = normalizeManualType(manual.type);
    const storageKind = normalizeStorageKind(
        manual.storageKind,
        manual.fileDataUrl ? "upload" : "url",
    );
    const normalizedLink = normalizeManualLink(manual.link);
    const normalizedFileDataUrl = storageKind === "upload" ? normalizePdfDataUrl(manual.fileDataUrl) : "";

    return {
        ...manual,
        title,
        subject,
        displaySubject: titleCase(subject),
        image: normalizeManualLink(manual.image),
        link: normalizedLink,
        type,
        storageKind: normalizedFileDataUrl ? "upload" : storageKind,
        fileDataUrl: normalizedFileDataUrl,
        fileName: normalizedFileDataUrl ? String(manual.fileName || "").trim() : "",
        mimeType: normalizedFileDataUrl ? String(manual.mimeType || "application/pdf").trim() : "",
        sizeBytes: normalizedFileDataUrl ? clampFileSize(manual.sizeBytes) : 0,
        _titleNorm: normalizeText(title),
        _subjectNorm: normalizeText(subject),
    };
}

export function normalizeOfficialManual(rawManual = {}, index = 0) {
    const title = String(rawManual.title || "").trim();
    const subject = String(rawManual.subject || "").trim();
    const mainImage = rawManual.image;
    const resources = Array.isArray(rawManual.resources) ? rawManual.resources : [];

    if (resources.length > 0) {
        return resources
            .map((resource, resourceIndex) => {
                const resourceType = String(resource.type || "web").trim().toLowerCase();
                const normalizedType = resourceType === "web" ? "link" : resourceType;
                const resourceLink = String(resource.link || "").trim();

                if (!resourceLink) return null;

                let displayTitle = title;
                if (resources.length > 1) {
                    const typeLabel = normalizedType === "link"
                        ? "Web"
                        : normalizedType === "pdf"
                            ? "PDF"
                            : "App";
                    displayTitle = `${title} (${typeLabel})`;
                }

                return addSearchMetadata({
                    id: `official-${index}-${resourceIndex}`,
                    title: displayTitle,
                    subject,
                    link: resourceLink,
                    image: resource.image || mainImage,
                    type: normalizedType,
                    source: "official",
                    storageKind: "url",
                    addedAt: 0,
                });
            })
            .filter(Boolean);
    }

    return [addSearchMetadata({
        id: `official-${index}`,
        title,
        subject,
        link: rawManual.link || "",
        image: mainImage,
        type: normalizeManualType(rawManual.type, "link"),
        source: "official",
        storageKind: "url",
        addedAt: 0,
    })];
}

export function normalizeCustomManual(rawManual = {}, index = 0) {
    const title = String(rawManual.title || "").trim();
    const subject = String(rawManual.subject || "").trim() || title;
    const inferredStorageKind = rawManual.fileDataUrl ? "upload" : "url";
    const storageKind = normalizeStorageKind(rawManual.storageKind, inferredStorageKind);
    const link = normalizeManualLink(rawManual.link);
    const fileDataUrl = storageKind === "upload" ? normalizePdfDataUrl(rawManual.fileDataUrl) : "";
    const type = normalizeManualType(rawManual.type, fileDataUrl ? "pdf" : "link");

    if (!title || !subject) return null;
    if (!link && !fileDataUrl) return null;

    return addSearchMetadata({
        id: String(rawManual.id || createId(`custom-${index}`)),
        title,
        subject,
        link,
        image: rawManual.image,
        type: fileDataUrl ? "pdf" : type,
        source: "custom",
        storageKind: fileDataUrl ? "upload" : "url",
        fileDataUrl,
        fileName: rawManual.fileName,
        mimeType: rawManual.mimeType,
        sizeBytes: rawManual.sizeBytes,
        addedAt: Number(rawManual.addedAt || Date.now()),
    });
}

export function serializeCustomManual(manual) {
    return {
        id: manual.id,
        title: manual.title,
        subject: manual.subject,
        link: manual.link || "",
        image: manual.image || "",
        type: manual.type,
        storageKind: manual.storageKind || "url",
        fileDataUrl: manual.fileDataUrl || "",
        fileName: manual.fileName || "",
        mimeType: manual.mimeType || "",
        sizeBytes: manual.sizeBytes || 0,
        addedAt: manual.addedAt || Date.now(),
    };
}

export function getSaveErrorMessage(error) {
    if (!error) return "Nu am putut salva manualul acum.";
    const quotaNames = new Set([
        "QuotaExceededError",
        "NS_ERROR_DOM_QUOTA_REACHED",
    ]);

    if (quotaNames.has(error.name)) {
        return "Nu mai este suficient spatiu in localStorage pentru acest PDF. Incearca un fisier mai mic sau sterge manuale salvate.";
    }

    return "Nu am putut salva manualul acum.";
}

export function sanitizeManualIdList(value) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const result = [];

    value.forEach((manualId) => {
        const normalized = String(manualId || "").trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        result.push(normalized);
    });

    return result.slice(0, 3);
}

export function sanitizeLibraryManualMap(value) {
    if (!value || typeof value !== "object") return {};

    return Object.fromEntries(
        Object.entries(value)
            .map(([key, manualIds]) => [normalizeText(key), sanitizeManualIdList(manualIds)])
            .filter(([key, manualIds]) => Boolean(key) && manualIds.length > 0),
    );
}

export function getBehaviorLabel(behavior) {
    const labels = {
        "open-all": "Deschide toate",
        buttons: "Butoane separate",
        both: "Ambele",
    };

    return labels[behavior] || labels["open-all"];
}
