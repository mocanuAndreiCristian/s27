/**
 * Weather Service - Handles weather API calls and data processing
 */

/**
 * Weather code to emoji mapping
 */
const WEATHER_EMOJIS = {
    0: "☀️",
    1: "🌤️",
    2: "🌤️",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌦️",
    55: "🌦️",
    56: "🌦️",
    57: "🌦️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    66: "🌧️",
    67: "🌧️",
    80: "🌧️",
    81: "🌧️",
    82: "🌧️",
    71: "❄️",
    73: "❄️",
    75: "❄️",
    77: "❄️",
    85: "❄️",
    86: "❄️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
};

/**
 * Weather code to description mapping
 */
const WEATHER_DESCRIPTIONS = {
    0: "Clear",
    1: "Partially Cloudy",
    2: "Partially Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    56: "Drizzle",
    57: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Rain",
    66: "Rain",
    67: "Rain",
    80: "Rain",
    81: "Rain",
    82: "Rain",
    71: "Snow",
    73: "Snow",
    75: "Snow",
    77: "Snow",
    85: "Snow",
    86: "Snow",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
};

/**
 * Get weather emoji for a weather code
 * @param {number} code - Weather code from API
 * @returns {string} Emoji representing the weather
 */
export function getWeatherEmoji(code) {
    return WEATHER_EMOJIS[code] || "❓";
}

/**
 * Get weather description for a weather code
 * @param {number} code - Weather code from API
 * @returns {string} Human-readable weather description
 */
export function getWeatherDescription(code) {
    return WEATHER_DESCRIPTIONS[code] || "Unknown";
}

/**
 * Format time from ISO string
 * @param {string} iso - ISO date string
 * @returns {string} Formatted time as HH:MM
 */
export function formatTime(iso) {
    const d = new Date(iso);
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

/**
 * Check if current time is night based on sunrise/sunset
 * @param {string} sunrise - Sunrise ISO string
 * @param {string} sunset - Sunset ISO string
 * @returns {boolean} True if it's night time
 */
export function isNightTime(sunrise, sunset) {
    const now = new Date();
    const sunriseTime = new Date(sunrise);
    const sunsetTime = new Date(sunset);
    return now < sunriseTime || now > sunsetTime;
}

/**
 * Fetch weather data from Open-Meteo API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Weather data object
 */
export async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch weather data");
    }
    
    return response.json();
}

/**
 * Fetch location name from coordinates using Nominatim
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string>} Location name
 */
export async function fetchLocationName(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return "Unknown location";
        }
        
        const data = await response.json();
        if (!data.address) {
            return "Unknown location";
        }
        
        let location = "Unknown location";
        if (data.address.city) {
            location = data.address.city;
        } else if (data.address.town) {
            location = data.address.town;
        } else if (data.address.village) {
            location = data.address.village;
        } else if (data.address.county) {
            location = data.address.county;
        }
        
        if (data.address.country_code) {
            location += ", " + data.address.country_code.toUpperCase();
        }
        
        return location;
    } catch {
        return "Unknown location";
    }
}

/**
 * Get current position using geolocation
 * @returns {Promise<GeolocationPosition>} Position object
 */
export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

/**
 * Process raw weather data into display format
 * @param {Object} data - Raw API response
 * @returns {Object} Processed weather data
 */
export function processWeatherData(data) {
    const weather = data.current_weather;
    const temp = `${weather.temperature}°C`;
    const sunrise = formatTime(data.daily.sunrise[0]);
    const sunset = formatTime(data.daily.sunset[0]);
    const isNight = isNightTime(data.daily.sunrise[0], data.daily.sunset[0]);
    const emoji = isNight ? "🌙" : getWeatherEmoji(weather.weathercode);
    const description = getWeatherDescription(weather.weathercode);
    
    return {
        temperature: temp,
        emoji,
        description,
        sunrise,
        sunset,
    };
}