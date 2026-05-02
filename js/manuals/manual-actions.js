import { buildSearchUrl } from "./manuals-model.js";

export function getManualOpenUrl(manual, fallbackUrl = "") {
    if (manual?.storageKind === "upload" && manual.fileDataUrl) {
        return manual.fileDataUrl;
    }

    return manual?.link || fallbackUrl || buildSearchUrl(manual?.subject || manual?.title || "");
}

export function openManualEntry(manual, fallbackUrl = "") {
    const targetUrl = getManualOpenUrl(
        manual,
        fallbackUrl || buildSearchUrl(manual?.subject || manual?.title || ""),
    );
    if (!targetUrl) return false;
    window.open(targetUrl, "_blank", "noopener");
    return true;
}

export function openManualEntries(manuals = [], fallbackUrl = "") {
    let openedAny = false;

    manuals.forEach((manual) => {
        if (openManualEntry(manual, fallbackUrl)) {
            openedAny = true;
        }
    });

    return openedAny;
}

