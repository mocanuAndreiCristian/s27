import { removeStorage, readStorage, writeStorage } from "../core/storage.js";
import { fillToday } from "../mobile/mobile-nav-controller.js";
import { updateRecommendedManual } from "../manuals/recommended-manuals.js";
import { getTimetableData, highlightCurrent, loadTimetableData } from "../timetable/timetable-controller.js";
import { getWeather } from "../weather/weather-controller.js";

const DEV_MODE_KEY = "dev-mode-enabled";
const DEV_TIME_OVERRIDE_KEY = "dev-time-override";
const DEV_WEATHER_OVERRIDE_KEY = "dev-weather-override";
const DEV_DAY_OVERRIDE_KEY = "dev-day-override";

let devModeInitialized = false;
let devInfoIntervalId = 0;
let devModeEnabled = readStorage(DEV_MODE_KEY, "false") === "true";
let devTimeOverride = readStorage(DEV_TIME_OVERRIDE_KEY, "")
    ? new Date(readStorage(DEV_TIME_OVERRIDE_KEY, ""))
    : null;
let devWeatherOverride = readStorage(DEV_WEATHER_OVERRIDE_KEY, "") || null;
let storedDayOverride = Number.parseInt(readStorage(DEV_DAY_OVERRIDE_KEY, ""), 10);
let devDayOverride = Number.isFinite(storedDayOverride) ? storedDayOverride : null;

function refreshHighlightAndManuals() {
    highlightCurrent();
    void updateRecommendedManual();
}

function refreshTodayViews() {
    highlightCurrent();
    fillToday();
}

function getWeatherDescriptionForCode(code) {
    if (code === 0) return "Clear";
    if ([1, 2].includes(code)) return "Partially Cloudy";
    if (code === 3) return "Cloudy";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Unknown";
}

function getWeatherEmoji(code) {
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "❔";
}

function updateDevWeather(code) {
    const emoji = getWeatherEmoji(code);
    const description = getWeatherDescriptionForCode(code);

    const menuEmoji = document.getElementById("menuWeatherEmoji");
    const menuTemp = document.getElementById("menuWeatherTemp");
    if (menuEmoji) menuEmoji.textContent = emoji;
    if (menuTemp) menuTemp.textContent = "DEV";

    const overlayEmoji = document.getElementById("overlayWeatherEmoji");
    const overlayDesc = document.getElementById("overlayWeatherDesc");
    if (overlayEmoji) overlayEmoji.textContent = emoji;
    if (overlayDesc) overlayDesc.textContent = `${description} (Dev Override)`;
}

export function getDevTimeOverride() {
    return devTimeOverride;
}

export function getDevDayOverride() {
    return devDayOverride;
}

export function installDevModeGlobals(global = window) {
    global.getDevTimeOverride = getDevTimeOverride;
    global.getDevDayOverride = getDevDayOverride;
}

export function initDevMode({ clearCustomizationStorage } = {}) {
    installDevModeGlobals();

    if (devModeInitialized) return;
    devModeInitialized = true;

    const devModeToggle = document.getElementById("devModeToggle");
    const devModeControls = document.getElementById("devModeControls");
    const devApplyTimeBtn = document.getElementById("devApplyTimeBtn");
    const devResetTimeBtn = document.getElementById("devResetTimeBtn");
    const devApplyWeatherBtn = document.getElementById("devApplyWeatherBtn");
    const devResetWeatherBtn = document.getElementById("devResetWeatherBtn");
    const devApplyDayBtn = document.getElementById("devApplyDayBtn");
    const devResetDayBtn = document.getElementById("devResetDayBtn");
    const devRefreshHighlightBtn = document.getElementById("devRefreshHighlightBtn");
    const devReloadDataBtn = document.getElementById("devReloadDataBtn");
    const devViewTodayBtn = document.getElementById("devViewTodayBtn");
    const devResetAllBtn = document.getElementById("devResetAllBtn");
    const devTimeInput = document.getElementById("devTimeInput");
    const devDaySelect = document.getElementById("devDaySelect");
    const baseTabItem = document.querySelector('.sidebar-item[data-section="base"]');

    if (!devModeToggle) return;

    const updateBaseTabVisibility = () => {
        if (baseTabItem) {
            baseTabItem.style.display = devModeEnabled ? "flex" : "none";
        }
    };

    devModeToggle.checked = devModeEnabled;
    if (devModeControls) {
        devModeControls.style.display = devModeEnabled ? "block" : "none";
    }
    updateBaseTabVisibility();

    devModeToggle.addEventListener("change", (event) => {
        devModeEnabled = event.target.checked;
        writeStorage(DEV_MODE_KEY, String(devModeEnabled));
        if (devModeControls) {
            devModeControls.style.display = devModeEnabled ? "block" : "none";
        }
        updateBaseTabVisibility();
        updateDevInfo();
    });

    devApplyTimeBtn?.addEventListener("click", () => {
        const timeStr = devTimeInput?.value;
        if (!timeStr) {
            alert("Please select a time");
            return;
        }

        const [hours, minutes] = timeStr.split(":").map(Number);
        const overrideDate = new Date();
        overrideDate.setHours(hours, minutes, 0, 0);
        devTimeOverride = overrideDate;
        writeStorage(DEV_TIME_OVERRIDE_KEY, overrideDate.toISOString());
        updateDevInfo();
        refreshHighlightAndManuals();

        const timeInfoEl = document.getElementById("devTimeInfo");
        if (timeInfoEl) {
            timeInfoEl.innerHTML = `Current override: <strong>${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}</strong>`;
        }
    });

    devResetTimeBtn?.addEventListener("click", () => {
        devTimeOverride = null;
        removeStorage(DEV_TIME_OVERRIDE_KEY);
        if (devTimeInput) devTimeInput.value = "";
        updateDevInfo();
        refreshHighlightAndManuals();

        const timeInfoEl = document.getElementById("devTimeInfo");
        if (timeInfoEl) {
            timeInfoEl.innerHTML = "Current override: <strong>None</strong>";
        }
    });

    devApplyWeatherBtn?.addEventListener("click", () => {
        const weatherSelect = document.getElementById("devWeatherSelect");
        const code = weatherSelect?.value;
        if (!code) {
            alert("Please select a weather condition");
            return;
        }

        devWeatherOverride = code;
        writeStorage(DEV_WEATHER_OVERRIDE_KEY, code);
        updateDevWeather(Number.parseInt(code, 10));

        const weatherInfoEl = document.getElementById("devWeatherInfo");
        if (weatherInfoEl) {
            weatherInfoEl.innerHTML = `Current override: <strong>${getWeatherDescriptionForCode(Number.parseInt(code, 10))}</strong>`;
        }
    });

    devResetWeatherBtn?.addEventListener("click", () => {
        devWeatherOverride = null;
        removeStorage(DEV_WEATHER_OVERRIDE_KEY);
        const weatherSelect = document.getElementById("devWeatherSelect");
        if (weatherSelect) weatherSelect.value = "";

        const weatherInfoEl = document.getElementById("devWeatherInfo");
        if (weatherInfoEl) {
            weatherInfoEl.innerHTML = "Current override: <strong>None</strong>";
        }

        void getWeather();
    });

    devApplyDayBtn?.addEventListener("click", () => {
        if (!devDaySelect) {
            alert("Day select element not found");
            return;
        }

        const dayValue = devDaySelect.value;
        if (dayValue === "") {
            alert("Please select a day");
            return;
        }

        const dayNum = Number.parseInt(dayValue, 10);
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        devDayOverride = dayNum;
        writeStorage(DEV_DAY_OVERRIDE_KEY, String(dayNum));
        updateDevInfo();
        refreshTodayViews();

        const dayInfoEl = document.getElementById("devDayInfo");
        if (dayInfoEl) {
            dayInfoEl.innerHTML = `Current override: <strong>${dayNames[dayNum]}</strong>`;
        }
    });

    devResetDayBtn?.addEventListener("click", () => {
        devDayOverride = null;
        removeStorage(DEV_DAY_OVERRIDE_KEY);
        if (devDaySelect) devDaySelect.value = "";
        updateDevInfo();
        refreshTodayViews();

        const dayInfoEl = document.getElementById("devDayInfo");
        if (dayInfoEl) {
            dayInfoEl.innerHTML = "Current override: <strong>None</strong>";
        }
    });

    devRefreshHighlightBtn?.addEventListener("click", () => {
        highlightCurrent();
        devRefreshHighlightBtn.innerHTML = '<i class="fa-solid fa-check"></i> Refreshed!';
        window.setTimeout(() => {
            devRefreshHighlightBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh Highlighting';
        }, 1500);
    });

    devReloadDataBtn?.addEventListener("click", () => {
        void loadTimetableData({ force: true });
        devReloadDataBtn.innerHTML = '<i class="fa-solid fa-check"></i> Reloaded!';
        window.setTimeout(() => {
            devReloadDataBtn.innerHTML = '<i class="fa-solid fa-reload"></i> Reload Timetable Data';
        }, 1500);
    });

    devViewTodayBtn?.addEventListener("click", () => {
        const timetableData = getTimetableData();
        if (!timetableData) {
            alert("Timetable data not loaded");
            return;
        }

        const now = new Date();
        const dayOfWeek = devDayOverride !== null ? devDayOverride : now.getDay();
        const dayKeys = [null, "monday", "tuesday", "wednesday", "thursday", "friday"];
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDayKey = dayKeys[dayOfWeek];

        if (!currentDayKey) {
            alert("No classes on weekends!");
            return;
        }

        const todayClasses = timetableData.schedule
            .map((row) => ({ ...row, dayClass: row[currentDayKey] }))
            .filter((row) => row.dayClass)
            .map((row) => `${row.time}: ${row.dayClass.name}`)
            .join("\n");

        if (!todayClasses) {
            alert("No classes on this day!");
            return;
        }

        const dayDisplayName = devDayOverride !== null
            ? `${dayNames[dayOfWeek]} (OVERRIDE)`
            : dayNames[dayOfWeek];
        alert(`${dayDisplayName}'s Classes:\n\n${todayClasses}`);
    });

    devResetAllBtn?.addEventListener("click", () => {
        if (!confirm("Are you sure you want to reset ALL customization settings?")) return;

        clearCustomizationStorage?.();
        removeStorage(DEV_MODE_KEY);
        removeStorage(DEV_TIME_OVERRIDE_KEY);
        removeStorage(DEV_WEATHER_OVERRIDE_KEY);
        removeStorage(DEV_DAY_OVERRIDE_KEY);
        window.location.reload();
    });

    if (devTimeOverride && devTimeInput) {
        const hours = devTimeOverride.getHours();
        const minutes = devTimeOverride.getMinutes();
        devTimeInput.value = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        const timeInfoEl = document.getElementById("devTimeInfo");
        if (timeInfoEl) {
            timeInfoEl.innerHTML = `Current override: <strong>${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}</strong>`;
        }
    }

    if (devWeatherOverride) {
        const weatherSelect = document.getElementById("devWeatherSelect");
        if (weatherSelect) weatherSelect.value = devWeatherOverride;

        const weatherInfoEl = document.getElementById("devWeatherInfo");
        if (weatherInfoEl) {
            weatherInfoEl.innerHTML = `Current override: <strong>${getWeatherDescriptionForCode(Number.parseInt(devWeatherOverride, 10))}</strong>`;
        }
    }

    if (devDayOverride !== null && devDaySelect) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        devDaySelect.value = String(devDayOverride);
        const dayInfoEl = document.getElementById("devDayInfo");
        if (dayInfoEl) {
            dayInfoEl.innerHTML = `Current override: <strong>${dayNames[devDayOverride]}</strong>`;
        }
    }

    if (devInfoIntervalId) {
        clearInterval(devInfoIntervalId);
    }

    devInfoIntervalId = window.setInterval(updateDevInfo, 1000);
    updateDevInfo();
}

function updateDevInfo() {
    const realTimeEl = document.getElementById("devInfoRealTime");
    const overrideTimeEl = document.getElementById("devInfoOverrideTime");
    const dayOfWeekEl = document.getElementById("devInfoDayOfWeek");
    const currentClassEl = document.getElementById("devInfoCurrentClass");

    const now = devTimeOverride || new Date();
    const realNow = new Date();

    if (realTimeEl) {
        const hours = realNow.getHours().toString().padStart(2, "0");
        const minutes = realNow.getMinutes().toString().padStart(2, "0");
        const seconds = realNow.getSeconds().toString().padStart(2, "0");
        realTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    if (overrideTimeEl) {
        if (devTimeOverride) {
            const hours = now.getHours().toString().padStart(2, "0");
            const minutes = now.getMinutes().toString().padStart(2, "0");
            overrideTimeEl.textContent = `${hours}:${minutes}`;
        } else {
            overrideTimeEl.textContent = "None";
        }
    }

    if (dayOfWeekEl) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayIndex = devDayOverride !== null ? devDayOverride : now.getDay();
        dayOfWeekEl.textContent = days[dayIndex];
    }

    const timetableData = getTimetableData();
    if (currentClassEl && timetableData) {
        const dayOfWeek = devDayOverride !== null ? devDayOverride : now.getDay();
        const currentMinutes = (now.getHours() * 60) + now.getMinutes();
        const dayKeys = [null, "monday", "tuesday", "wednesday", "thursday", "friday"];
        const currentDayKey = dayKeys[dayOfWeek];
        let currentClass = "None";

        if (currentDayKey) {
            for (const row of timetableData.schedule) {
                const match = row.time.match(/^(\d{1,2}):(\d{2})/);
                if (!match) continue;

                const start = (Number.parseInt(match[1], 10) * 60) + Number.parseInt(match[2], 10);
                const windowStart = start - 10;
                const windowEnd = start + 50;

                if (currentMinutes >= windowStart && currentMinutes < windowEnd) {
                    const subject = row[currentDayKey];
                    if (subject) currentClass = subject.name;
                    break;
                }
            }
        }

        currentClassEl.textContent = currentClass;
    }
}
