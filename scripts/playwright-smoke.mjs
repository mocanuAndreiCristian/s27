import { chromium } from "playwright";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8127";
const classPages = ["8a", "8b", "8c", "8d", "8e"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const logs = [];

page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
        logs.push(`${message.type()}: ${message.text()}`);
    }
});

page.on("pageerror", (error) => {
    logs.push(`pageerror: ${error.message}`);
});

const results = [];

for (const classId of classPages) {
    await page.goto(`${baseUrl}/${classId}/`, { waitUntil: "networkidle" });

    results.push(await page.evaluate(() => ({
        title: document.title,
        appCore: Boolean(window.AppCore),
        overlayManager: Boolean(window.overlayManager),
        timetableRows: document.querySelectorAll("#timetable tbody tr").length,
        timetableError: Boolean(document.querySelector("#timetable.has-error")),
        moduleScript: Boolean(document.querySelector('script[type="module"][src="../js/app.js"]')),
    })));
}

await browser.close();

const failures = results.filter((result) => (
    !result.appCore ||
    !result.overlayManager ||
    result.timetableRows === 0 ||
    result.timetableError ||
    !result.moduleScript
));

console.log(JSON.stringify({ baseUrl, results, logs }, null, 2));

if (failures.length || logs.length) {
    process.exitCode = 1;
}

