import { $, dom, shortcuts, getAdv } from './mobile-state.js';

export function upShortcuts() {
    const s = getAdv(),
        a = shortcuts[s.shortcut1] ? s.shortcut1 : "customization",
        b = shortcuts[s.shortcut2] ? s.shortcut2 : "weather";
    if (dom.navShortcut1) {
        const [i, l] = shortcuts[a];
        dom.navShortcut1.querySelector("i").className = i;
        dom.navShortcut1.querySelector("span").textContent = l;
        dom.navShortcut1.dataset.shortcutType = a;
    }
    if (dom.navShortcut2) {
        const [i, l] = shortcuts[b];
        dom.navShortcut2.querySelector("i").className = i;
        dom.navShortcut2.querySelector("span").textContent = l;
        dom.navShortcut2.dataset.shortcutType = b;
    }
    syncWeather();
}

export function syncWeather() {
    const me = $("#menuWeatherEmoji"),
        mt = $("#menuWeatherTemp"),
        se = $("#sheetWeatherEmoji"),
        st = $("#sheetWeatherTemp");
    if (me && se) se.textContent = me.textContent;
    if (mt && st) st.textContent = mt.textContent;
    [dom.navShortcut1, dom.navShortcut2].forEach((btn) => {
        if (!btn || btn.dataset.shortcutType !== "weather") return;
        const i = btn.querySelector("i"),
            s = btn.querySelector("span");
        if (me && me.textContent !== "?" && me.textContent !== "??") {
            if (i) {
                i.className = "";
                i.textContent = me.textContent;
                i.style.fontStyle = "normal";
                i.style.fontSize = "1.3rem";
            }
            if (s && mt && mt.textContent !== "--�C")
                s.textContent = mt.textContent;
        }
    });
}
