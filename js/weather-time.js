/* ========================================
   WEATHER & TIME: Clock, Forecasts
   ======================================== */

// --- CLOCK OVERLAY ---
const clockBtn = document.getElementById("clockBtn");
const timeOverlay = document.getElementById("timeOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");

function updateClock() {
    const devOverride = window.getDevTimeOverride?.();
    const now = devOverride || new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    const dateStr = now.toLocaleDateString(undefined, options);
    if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    if (dateEl) dateEl.textContent = dateStr;
}

if (window.overlayManager) {
    window.overlayManager.register("timeOverlay");
}

if (clockBtn) {
    clockBtn.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            window.overlayManager.open("timeOverlay");
        }
        updateClock();
    });
}

if (closeOverlay) {
    closeOverlay.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("timeOverlay");
        }
    });
}

setInterval(updateClock, 1000);

// --- TITLE TIME DISPLAY ---
function updateTitleTime() {
    const devOverride = window.getDevTimeOverride?.();
    const now = devOverride || new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const timeEl = document.getElementById("titleTime");
    const dateEl = document.getElementById("titleDate");
    
    if (timeEl) {
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    if (dateEl) {
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        dateEl.textContent = now.toLocaleDateString('ro-RO', options);
    }
}

// Update every second
setInterval(updateTitleTime, 1000);
updateTitleTime();

document.getElementById("titleTime")?.addEventListener("click", function () {
    const clockBtn = document.getElementById("clockBtn");
    if (clockBtn) clockBtn.click();
});

// --- WEATHER SYSTEM ---
let lastWeatherUpdate = null;

function getWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchWeatherData, handleLocationError);
    } else {
        updateWeatherError("Geolocation is not supported by this browser.");
    }
}

function fetchWeatherData(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;

    fetch(url)
        .then((res) => res.json())
        .then((data) => {
            const weather = data.current_weather;
            const temp = `${weather.temperature}°C`;
            const sunrise = formatTime(data.daily.sunrise[0]);
            const sunset = formatTime(data.daily.sunset[0]);
            const now = new Date();
            const sunriseTime = new Date(data.daily.sunrise[0]);
            const sunsetTime = new Date(data.daily.sunset[0]);
            const isNight = now < sunriseTime || now > sunsetTime;
            const emoji = isNight ? "🌙" : getWeatherEmoji(weather.weathercode);
            const description = getWeatherDescription(weather.weathercode);

            // Update menu button
            const menuEmoji = document.getElementById("menuWeatherEmoji");
            const menuTemp = document.getElementById("menuWeatherTemp");
            if (menuEmoji) menuEmoji.textContent = emoji;
            if (menuTemp) menuTemp.textContent = temp;

            // Update overlay
            const overlayEmoji = document.getElementById("overlayWeatherEmoji");
            const overlayTemp = document.getElementById("overlayWeatherTemp");
            const overlayDesc = document.getElementById("overlayWeatherDesc");
            const overlaySunrise = document.getElementById("overlaySunrise");
            const overlaySunset = document.getElementById("overlaySunset");
            
            if (overlayEmoji) overlayEmoji.textContent = emoji;
            if (overlayTemp) overlayTemp.textContent = temp;
            if (overlayDesc) overlayDesc.textContent = description;
            if (overlaySunrise) overlaySunrise.textContent = sunrise;
            if (overlaySunset) overlaySunset.textContent = sunset;

            // Update last update time
            lastWeatherUpdate = new Date();
            updateLastUpdateTime();

            fetchLocationName(lat, lon);
        })
        .catch(() => {
            updateWeatherError("Failed to fetch weather data.");
        });
}

function fetchLocationName(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then((res) => res.json())
        .then((data) => {
            let location = "Unknown location";
            if (data.address) {
                if (data.address.city) location = data.address.city;
                else if (data.address.town) location = data.address.town;
                else if (data.address.village) location = data.address.village;
                else if (data.address.county) location = data.address.county;
                if (data.address.country_code)
                    location += ", " + data.address.country_code.toUpperCase();
            }
            const locationEl = document.getElementById("overlayWeatherLocation");
            if (locationEl) locationEl.textContent = location;
        })
        .catch(() => {
            const locationEl = document.getElementById("overlayWeatherLocation");
            if (locationEl) locationEl.textContent = "Unknown location";
        });
}

function handleLocationError() {
    updateWeatherError("Error obtaining geolocation");
}

function updateWeatherError(message) {
    const menuEmoji = document.getElementById("menuWeatherEmoji");
    const menuTemp = document.getElementById("menuWeatherTemp");
    const overlayDesc = document.getElementById("overlayWeatherDesc");
    
    if (menuEmoji) menuEmoji.textContent = "❌";
    if (menuTemp) menuTemp.textContent = "Error";
    if (overlayDesc) overlayDesc.textContent = message;
}

function formatTime(iso) {
    const d = new Date(iso);
    return (
        d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0")
    );
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
    return "❓";
}

function getWeatherDescription(code) {
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

function updateLastUpdateTime() {
    if (!lastWeatherUpdate) return;

    const now = new Date();
    const diff = Math.floor((now - lastWeatherUpdate) / 1000);

    let timeText;
    if (diff < 60) {
        timeText = "Just now";
    } else if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        timeText = `${mins} minute${mins > 1 ? "s" : ""} ago`;
    } else {
        const hours = Math.floor(diff / 3600);
        timeText = `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    const updateEl = document.getElementById("lastWeatherUpdate");
    if (updateEl) updateEl.textContent = timeText;
}

function updateOverlayTime() {
    const devOverride = window.getDevTimeOverride?.();
    const now = devOverride || new Date();
    const timeStr =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0") +
        ":" +
        now.getSeconds().toString().padStart(2, "0");
    const dateStr =
        now.getDate().toString().padStart(2, "0") +
        "/" +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        "/" +
        now.getFullYear();

    const timeEl = document.getElementById("overlayCurrentTime");
    const dateEl = document.getElementById("overlayCurrentDate");
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

// Initialize weather
getWeather();
setInterval(getWeather, 300000); // Update every 5 minutes
setInterval(updateLastUpdateTime, 30000); // Update "last updated" every 30 seconds
setInterval(updateOverlayTime, 1000); // Update time every second

// Weather overlay controls
const weatherBtn = document.getElementById("weatherBtn");
const closeWeatherOverlay = document.getElementById("closeWeatherOverlay");
const refreshWeatherBtn = document.getElementById("refreshWeatherBtn");

if (window.overlayManager) {
    window.overlayManager.register("weatherOverlay");
}

if (weatherBtn) {
    weatherBtn.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            window.overlayManager.open("weatherOverlay");
        }
        updateOverlayTime();
    });
}

if (closeWeatherOverlay) {
    closeWeatherOverlay.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("weatherOverlay");
        }
    });
}

if (refreshWeatherBtn) {
    refreshWeatherBtn.addEventListener("click", () => {
        refreshWeatherBtn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...';
        refreshWeatherBtn.disabled = true;

        getWeather();

        setTimeout(() => {
            refreshWeatherBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh Weather';
            refreshWeatherBtn.disabled = false;
        }, 2000);
    });
}