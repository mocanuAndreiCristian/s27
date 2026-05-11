const GOOGLE_FONTS_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;600;700&family=Ubuntu:wght@400;500;700&family=Nunito:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Fira+Code:wght@400;600&display=swap";

export function setupGoogleFonts(state) {
    if (state.googleFontsLink) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
    state.googleFontsLink = link;
}

export function loadGoogleFont(fontFamily) {
    void fontFamily;
}

export function loadSavedCustomFonts(readCustomFonts) {
    const select = document.getElementById("fontSelect");
    if (!select) return;

    readCustomFonts().forEach((fontName) => {
        const option = document.createElement("option");
        option.value = `'${fontName}', sans-serif`;
        option.textContent = `${fontName} (Custom)`;
        select.appendChild(option);
    });
}

export function addCustomGoogleFont({
    readCustomFonts,
    saveCustomFonts,
    onSelectFont,
}) {
    const name = prompt("Font Name (Google Fonts):");
    if (!name || !name.trim()) return false;

    const trimmedName = name.trim();
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${trimmedName.replace(/ /g, "+")}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const fonts = readCustomFonts();
    if (!fonts.includes(trimmedName)) {
        fonts.push(trimmedName);
        saveCustomFonts(fonts);
    }

    const select = document.getElementById("fontSelect");
    if (!select) return false;

    const value = `'${trimmedName}', sans-serif`;
    let option = Array.from(select.options).find((entry) => entry.value === value) || null;
    if (!option) {
        option = document.createElement("option");
        option.value = value;
        option.textContent = `${trimmedName} (Custom)`;
        select.appendChild(option);
    }

    select.value = option.value;
    onSelectFont?.(option.value);
    return true;
}
