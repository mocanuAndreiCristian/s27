export function nowMillis() {
    return window.performance?.now ? window.performance.now() : Date.now();
}

export function getDevTimeOverride() {
    return typeof window.getDevTimeOverride === "function"
        ? window.getDevTimeOverride()
        : null;
}

export function getDevDayOverride() {
    return typeof window.getDevDayOverride === "function"
        ? window.getDevDayOverride()
        : null;
}

export function getEffectiveDate() {
    return getDevTimeOverride() || new Date();
}

export function getEffectiveDayOfWeek(date = getEffectiveDate()) {
    const dayOverride = getDevDayOverride();
    return dayOverride !== null ? dayOverride : date.getDay();
}

export function parseClockTimeToMinutes(time = "") {
    const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
}

