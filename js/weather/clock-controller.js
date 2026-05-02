/**
 * Clock Controller - Handles time display and clock overlay
 */

/**
 * Get the current time, with optional dev override
 * @returns {Date} Current time or dev override
 */
export function getCurrentTime() {
    return window.getDevTimeOverride?.() || new Date();
}

/**
 * Format time as HH:MM:SS
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string
 */
export function formatTimeString(date) {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format date for display
 * @param {Date} date - Date object to format
 * @param {string} locale - Locale for formatting
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateString(date, locale = undefined, options = {}) {
    return date.toLocaleDateString(locale, options);
}

/**
 * Update the main clock display
 */
export function updateClock() {
    const now = getCurrentTime();
    const timeStr = formatTimeString(now);
    const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    const dateStr = formatDateString(now, undefined, options);
    
    const timeEl = document.getElementById("time");
    const dateEl = document.getElementById("date");
    
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

/**
 * Update the title time display
 */
export function updateTitleTime() {
    const now = getCurrentTime();
    const timeStr = formatTimeString(now);
    
    const timeEl = document.getElementById("titleTime");
    const dateEl = document.getElementById("titleDate");
    
    if (timeEl) {
        timeEl.textContent = timeStr;
    }
    
    if (dateEl) {
        const options = { weekday: "short", day: "numeric", month: "short" };
        dateEl.textContent = formatDateString(now, "ro-RO", options);
    }
}

/**
 * Update the overlay time display
 */
export function updateOverlayTime() {
    const now = getCurrentTime();
    const timeStr = formatTimeString(now);
    const dateStr = 
        now.getDate().toString().padStart(2, "0") + "/" +
        (now.getMonth() + 1).toString().padStart(2, "0") + "/" +
        now.getFullYear();
    
    const timeEl = document.getElementById("overlayCurrentTime");
    const dateEl = document.getElementById("overlayCurrentDate");
    
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

/**
 * Setup clock button event listener
 * @param {Object} overlayManager - The overlay manager instance
 */
export function setupClockButton(overlayManager) {
    const clockBtn = document.getElementById("clockBtn");
    if (!clockBtn) return;
    
    clockBtn.addEventListener("click", () => {
        if (overlayManager) {
            overlayManager.close("sideMenu");
            overlayManager.open("timeOverlay");
        }
        updateClock();
    });
}

/**
 * Setup title time click to open clock overlay
 * @param {Object} overlayManager - The overlay manager instance
 */
export function setupTitleTimeClick(overlayManager) {
    const titleTime = document.getElementById("titleTime");
    if (!titleTime) return;
    
    titleTime.addEventListener("click", () => {
        const clockBtn = document.getElementById("clockBtn");
        if (clockBtn) clockBtn.click();
    });
}

/**
 * Setup close button for time overlay
 * @param {Object} overlayManager - The overlay manager instance
 */
export function setupCloseTimeOverlay(overlayManager) {
    const closeOverlay = document.getElementById("closeOverlay");
    if (!closeOverlay) return;
    
    closeOverlay.addEventListener("click", () => {
        if (overlayManager) {
            overlayManager.close("timeOverlay");
        }
    });
}

/**
 * Initialize clock with overlay manager
 * @param {Object} overlayManager - The overlay manager instance
 */
export function initClock(overlayManager) {
    if (overlayManager) {
        overlayManager.register("timeOverlay");
    }
    
    setupClockButton(overlayManager);
    setupTitleTimeClick(overlayManager);
    setupCloseTimeOverlay(overlayManager);
    
    // Start intervals
    setInterval(updateClock, 1000);
    setInterval(updateTitleTime, 1000);
    updateTitleTime();
}