import { dom } from './mobile-state.js';

export function upHeader() {
    if (!dom.mobileHeaderTime || !dom.mobileHeaderDate) return;
    const d = new Date(),
        h = String(d.getHours()).padStart(2, "0"),
        m = String(d.getMinutes()).padStart(2, "0");
    dom.mobileHeaderTime.textContent = `${h}:${m}`;
    dom.mobileHeaderDate.textContent = d.toLocaleDateString("ro-RO", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}