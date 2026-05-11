/**
 * Weather Controller - Handles weather UI and overlay interactions
 */

import {
    fetchWeatherData,
    fetchLocationName,
    getCurrentPosition,
    processWeatherData,
} from "./weather-service.js";

import { updateOverlayTime } from "./clock-controller.js";

let lastWeatherUpdate = null;

/**
 * Update the "last updated" time display
 */
export function updateLastUpdateTime() {
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

/**
 * Update menu button with weather info
 * @param {Object} weatherData - Processed weather data
 */
export function updateMenuWeather(weatherData) {
    const menuEmoji = document.getElementById("menuWeatherEmoji");
    const menuTemp = document.getElementById("menuWeatherTemp");
    
    if (menuEmoji) menuEmoji.textContent = weatherData.emoji;
    if (menuTemp) menuTemp.textContent = weatherData.temperature;
}

/**
 * Update weather overlay with weather info
 * @param {Object} weatherData - Processed weather data
 * @param {string} location - Location name
 */
export function updateWeatherOverlay(weatherData, location) {
    const overlayEmoji = document.getElementById("overlayWeatherEmoji");
    const overlayTemp = document.getElementById("overlayWeatherTemp");
    const overlayDesc = document.getElementById("overlayWeatherDesc");
    const overlaySunrise = document.getElementById("overlaySunrise");
    const overlaySunset = document.getElementById("overlaySunset");
    const overlayLocation = document.getElementById("overlayWeatherLocation");
    
    if (overlayEmoji) overlayEmoji.textContent = weatherData.emoji;
    if (overlayTemp) overlayTemp.textContent = weatherData.temperature;
    if (overlayDesc) overlayDesc.textContent = weatherData.description;
    if (overlaySunrise) overlaySunrise.textContent = weatherData.sunrise;
    if (overlaySunset) overlaySunset.textContent = weatherData.sunset;
    if (overlayLocation) overlayLocation.textContent = location;
}

/**
 * Update weather error state in UI
 * @param {string} message - Error message to display
 */
export function updateWeatherError(message) {
    const menuEmoji = document.getElementById("menuWeatherEmoji");
    const menuTemp = document.getElementById("menuWeatherTemp");
    const overlayDesc = document.getElementById("overlayWeatherDesc");
    
    if (menuEmoji) menuEmoji.textContent = "❌";
    if (menuTemp) menuTemp.textContent = "Error";
    if (overlayDesc) overlayDesc.textContent = message;
}

/**
 * Fetch and display weather
 * @param {Object} options - Options object
 * @param {Function} [options.onError] - Error callback
 */
export async function getWeather(options = {}) {
    try {
        const position = await getCurrentPosition();
        const { coords } = position;
        const lat = coords.latitude;
        const lon = coords.longitude;
        
        const data = await fetchWeatherData(lat, lon);
        const weatherData = processWeatherData(data);
        
        // Update UI
        updateMenuWeather(weatherData);
        
        // Fetch and set location
        const location = await fetchLocationName(lat, lon);
        updateWeatherOverlay(weatherData, location);
        
        // Update last update time
        lastWeatherUpdate = new Date();
        updateLastUpdateTime();
    } catch (error) {
        const message = error.message || "Failed to fetch weather data.";
        updateWeatherError(message);
        if (options.onError) options.onError(error);
    }
}

/**
 * Refresh weather with loading state
 * @param {HTMLElement} refreshBtn - Refresh button element
 */
async function refreshWeatherButton(refreshBtn) {
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    try {
        await getWeather();
    } finally {
        setTimeout(() => {
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
        }, 2000);
    }
}

/**
 * Setup weather button event listener
 * @param {Object} overlayManager - The overlay manager instance
 */
export function setupWeatherButton(overlayManager) {
    const weatherBtn = document.getElementById("weatherBtn");
    if (!weatherBtn) return;
    
    weatherBtn.addEventListener("click", () => {
        if (overlayManager) {
            overlayManager.close("sideMenu");
            overlayManager.open("weatherOverlay");
        }
        updateOverlayTime();
    });
}

/**
 * Setup close button for weather overlay
 * @param {Object} overlayManager - The overlay manager instance
 */
export function setupCloseWeatherOverlay(overlayManager) {
    const closeWeatherOverlay = document.getElementById("closeWeatherOverlay");
    if (!closeWeatherOverlay) return;
    
    closeWeatherOverlay.addEventListener("click", () => {
        if (overlayManager) {
            overlayManager.close("weatherOverlay");
        }
    });
}

/**
 * Setup refresh button for weather
 * @param {HTMLElement} refreshBtn - Refresh button element
 */
export function setupRefreshWeather(refreshBtn) {
    if (!refreshBtn) return;
    
    refreshBtn.addEventListener("click", () => {
        refreshWeatherButton(refreshBtn);
    });
}

/**
 * Initialize weather system
 * @param {Object} overlayManager - The overlay manager instance
 */
export function initWeather(overlayManager) {
    if (overlayManager) {
        overlayManager.register("weatherOverlay");
    }
    
    setupWeatherButton(overlayManager);
    setupCloseWeatherOverlay(overlayManager);
    
    const refreshWeatherBtn = document.getElementById("refreshWeatherBtn");
    setupRefreshWeather(refreshWeatherBtn);
    
    // Initial fetch
    getWeather();
    
    // Set up intervals
    setInterval(getWeather, 300000); // Update every 5 minutes
    setInterval(updateLastUpdateTime, 30000); // Update "last updated" every 30 seconds
}

// Export for backward compatibility
export { getWeather as refreshWeather };
