export function stripHtml(value = "") {
    return String(value).replace(/<[^>]*>/g, " ");
}

export function stripEmoji(value = "") {
    return String(value).replace(
        /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu,
        "",
    );
}

export function normalizeText(value = "") {
    const stripped = stripHtml(stripEmoji(value));
    const lettersOnly = stripped.replace(/[^\p{L}\p{N}\s\-]+/gu, " ");
    const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
}

export function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

