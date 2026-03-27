

/* ========================================
   MANUALS: Popup & Recommendation System
   ======================================== */

let allManualsData = [];

async function loadManualsData() {
    const dataPath = window.DATA_PATH || 'data/';
    try {
        const response = await fetch(`${dataPath}manuals.json`);
        allManualsData = await response.json();
        renderManualsPopup();
        updateRecommendedManual();
    } catch (error) {
        console.error("Error loading manuals data:", error);
    }
}

function renderManualsPopup() {
    const manualsPopupContent = document.getElementById("manualsPopupContent");
    if (!manualsPopupContent || allManualsData.length === 0) return;

    manualsPopupContent.innerHTML = "";
    allManualsData.forEach(manual => {
        const container = document.createElement("div");
        container.className = "container";
        
        const link = document.createElement("a");
        link.href = manual.link;
        link.target = "_blank";
        
        if (manual.image) {
            const img = document.createElement("img");
            img.src = manual.image;
            img.alt = manual.title;
            link.appendChild(img);
        }
        
        const title = document.createElement("h2");
        title.textContent = manual.title;
        
        container.appendChild(link);
        container.appendChild(title);
        manualsPopupContent.appendChild(container);
    });
}

function initManualPopup() {
    // Register Overlay
    if (window.overlayManager) {
        window.overlayManager.register("manualsPopup");
    }

    const allManualsBtn = document.getElementById("allManualsBtn");
    const closeManualsPopup = document.getElementById("closeManualsPopup");

    // All manuals popup triggers
    if (allManualsBtn) {
        allManualsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (window.overlayManager) {
                window.overlayManager.close("sideMenu");
                window.overlayManager.open("manualsPopup");
            }
        });
    }

    if (closeManualsPopup) {
        closeManualsPopup.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (window.overlayManager) {
                window.overlayManager.close("manualsPopup");
            }
        });
    }
    
    loadManualsData();
}

// Search bar logic
function initSearchBar() {
    const manualSearch = document.getElementById("manualSearch");
    const manualsPopupContent = document.getElementById("manualsPopupContent");
    
    if (manualSearch && manualsPopupContent) {
        manualSearch.addEventListener("input", () => {
            const term = manualSearch.value.toLowerCase();
            const manuals = manualsPopupContent.querySelectorAll(".container");
            manuals.forEach((container) => {
                const titleEl = container.querySelector("h2");
                if (titleEl) {
                    const title = titleEl.textContent.toLowerCase();
                    if (title.includes(term)) {
                        container.style.display = "";
                    } else {
                        container.style.display = "none";
                    }
                }
            });
        });
    }
}

/* --- RECOMMENDED MANUAL LOGIC --- */

function normalizeText(s = "") {
    const stripped = s.replace(/<[^>]*>/g, "");
    const lettersOnly = stripped.replace(/[^\p{L}\s]/gu, " ");
    const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
}

function findBestManualForSubject(subjectText) {
    const subjectNorm = normalizeText(subjectText);
    let best = null;
    let bestScore = 0;

    allManualsData.forEach((manual) => {
        const titleNorm = normalizeText(manual.title || "");
        if (!titleNorm) return;
        
        const titleTokens = titleNorm.split(" ").filter(Boolean);
        const subjTokens = subjectNorm.split(" ").filter(Boolean);
        let score = 0;
        
        titleTokens.forEach((t) => {
            if (subjTokens.includes(t)) score += 2;
            else if (subjectNorm.includes(t)) score += 1;
        });
        
        if (titleNorm === subjectNorm) score += 5;
        if (subjectNorm.includes(titleNorm) || titleNorm.includes(subjectNorm)) score += 3;

        if (score > bestScore) {
            bestScore = score;
            best = manual;
        }
    });

    return best;
}

function parseTimeCellToDate(timeStr, referenceDate) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes || 0, 0, 0);
    return date;
}

async function updateRecommendedManual() {
    const devOverride = window.getDevTimeOverride?.();
    const devDayOverride = window.getDevDayOverride?.();
    const now = devOverride || new Date();
    let day = devDayOverride !== null ? devDayOverride : now.getDay();
    const recManualEl = document.querySelector("#recommendedManual .manual-card");
    const mobileRecEl = document.getElementById("mobileRecommendedManual");
    
    // Helper to hide elements
    const hideAll = () => {
        if (recManualEl) recManualEl.innerHTML = "<p>No textbook available</p>";
        if (mobileRecEl) mobileRecEl.classList.remove('active');
    };

    if (day === 0 || day === 6) {
        hideAll();
        return;
    }

    // Use current schedule from timetable.js if available, or fetch it
    let schedule = [];
    if (window.timetableData) {
        schedule = window.timetableData.schedule;
    } else {
        const dataPath = window.DATA_PATH || 'data/';
        const classId = window.CLASS_ID || '8d';
        try {
            const res = await fetch(`${dataPath}${classId}.json`);
            const data = await res.json();
            schedule = data.schedule;
        } catch (e) {
            return;
        }
    }

    const dayKeys = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const currentDayKey = dayKeys[day];

    let matchedSubject = null;
    for (const row of schedule) {
        const classStart = parseTimeCellToDate(row.time, now);
        const windowStart = new Date(classStart.getTime() - 10 * 60 * 1000);
        const windowEnd = new Date(classStart.getTime() + 50 * 60 * 1000);
        
        if (now >= windowStart && now < windowEnd) {
            const subject = row[currentDayKey];
            if (subject) {
                matchedSubject = subject.name;
                break;
            }
        }
    }

    if (recManualEl) {
        recManualEl.innerHTML = "";
        recManualEl.onclick = null;
    }
    
    if (mobileRecEl) {
        mobileRecEl.innerHTML = "";
        mobileRecEl.onclick = null;
        mobileRecEl.classList.remove('active');
    }

    if (!matchedSubject) {
        hideAll();
        return;
    }

    const best = findBestManualForSubject(matchedSubject);
    
    // --- Desktop Sidebar Render ---
    if (recManualEl) {
        if (!best) {
            const p = document.createElement("p");
            p.textContent = matchedSubject.trim() || "No textbook available";
            recManualEl.appendChild(p);
        } else {
            if (best.image) {
                const img = document.createElement("img");
                img.src = best.image;
                img.style.width = "100%";
                img.style.borderRadius = "var(--border-radius-sm)";
                recManualEl.appendChild(img);
            }
            const p = document.createElement("p");
            p.textContent = best.title;
            recManualEl.appendChild(p);

            if (best.link) {
                recManualEl.style.cursor = "pointer";
                recManualEl.onclick = () => window.open(best.link, "_blank");
            }
        }
    }

    // --- Mobile Render (Text Only) ---
    if (mobileRecEl && best) {
        mobileRecEl.classList.add('active');
        const h3 = document.createElement("h3");
        h3.textContent = "Current Textbook";
        
        const p = document.createElement("p");
        p.textContent = best.title;
        
        mobileRecEl.appendChild(h3);
        mobileRecEl.appendChild(p);
        
        if (best.link) {
            mobileRecEl.onclick = () => window.open(best.link, "_blank");
        }
    }
}

// Initialize logic
function init() {
    initManualPopup();
    initSearchBar();
    setInterval(updateRecommendedManual, 30000);
}

// Ensure init runs even if DOMContentLoaded has already fired
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}