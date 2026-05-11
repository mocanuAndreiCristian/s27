export function normalizeHexColor(color) {
    if (typeof color !== "string") return "";

    let value = color.trim();
    if (!value) return "";
    if (!value.startsWith("#")) value = `#${value}`;

    if (/^#[0-9a-f]{3}$/i.test(value)) {
        value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }

    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "";
}

export function hexToRgb(color) {
    const normalized = normalizeHexColor(color);
    if (!normalized) return null;

    const value = parseInt(normalized.slice(1), 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

export function getRelativeLuminance(color) {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;

    const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

export function getAccessibleTextColor(backgroundColor) {
    const luminance = getRelativeLuminance(backgroundColor);
    const blackContrast = (luminance + 0.05) / 0.05;
    const whiteContrast = 1.05 / (luminance + 0.05);
    return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}

