import { normalizeText } from "../core/text.js";
import { normalizeManualType } from "./manuals-model.js";

export function getSubjectScore(manual, subjectNorm) {
    const titleTokens = String(manual?._titleNorm || "").split(" ").filter(Boolean);
    const subjectTokens = String(subjectNorm || "").split(" ").filter(Boolean);
    let score = 0;

    titleTokens.forEach((token) => {
        if (subjectTokens.includes(token)) score += 2;
        else if (subjectNorm.includes(token)) score += 1;
    });

    if (manual?._titleNorm === subjectNorm || manual?._subjectNorm === subjectNorm) score += 5;
    if (subjectNorm.includes(manual?._titleNorm || "") || String(manual?._titleNorm || "").includes(subjectNorm)) score += 3;
    if (String(manual?._subjectNorm || "").includes(subjectNorm) || subjectNorm.includes(manual?._subjectNorm || "")) score += 4;

    return score;
}

export function findBestManualForSubject(subjectText, manuals = [], options = {}) {
    const subjectNorm = normalizeText(subjectText);
    if (!subjectNorm) return null;

    const preferredType = normalizeManualType(options.preferredType, "link");
    let best = null;
    let bestScore = 0;

    manuals.forEach((manual) => {
        const baseScore = getSubjectScore(manual, subjectNorm);
        if (baseScore <= 0) return;

        let score = baseScore;
        if (manual.type === preferredType) score += 6;
        if (manual.source === "custom") score += 1;

        const isBetter =
            score > bestScore ||
            (score === bestScore && (manual.addedAt || 0) > (best?.addedAt || 0));

        if (isBetter) {
            bestScore = score;
            best = manual;
        }
    });

    return best;
}

export function findConfiguredSubjectKey(subjectText, manualMap = {}) {
    const subjectNorm = normalizeText(subjectText);
    if (!subjectNorm) return "";
    if (manualMap[subjectNorm]?.length) return subjectNorm;

    let bestKey = "";
    let bestScore = 0;

    Object.keys(manualMap).forEach((candidateKey) => {
        const pseudoManual = {
            _titleNorm: candidateKey,
            _subjectNorm: candidateKey,
        };
        const score = getSubjectScore(pseudoManual, subjectNorm);
        if (score > bestScore) {
            bestScore = score;
            bestKey = candidateKey;
        }
    });

    return bestScore > 0 ? bestKey : "";
}

export function getConfiguredManualsForSubject(subjectText, manualMap = {}, manuals = []) {
    const matchedKey = findConfiguredSubjectKey(subjectText, manualMap);
    if (!matchedKey) return [];

    const manualIds = manualMap[matchedKey] || [];
    return manualIds
        .map((manualId) => manuals.find((manual) => manual.id === manualId) || null)
        .filter(Boolean)
        .slice(0, 3);
}

export function getManualSetForSubject(subjectText, manuals = [], settings = {}) {
    const configured = getConfiguredManualsForSubject(
        subjectText,
        settings.libraryRecommendedManualMap,
        manuals,
    );

    if (configured.length) {
        return configured;
    }

    const best = findBestManualForSubject(subjectText, manuals, {
        preferredType: settings.libraryPreferredOpenType,
    });

    return best ? [best] : [];
}
