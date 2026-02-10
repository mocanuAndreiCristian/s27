

/* ========================================
   MOBILE NAVIGATION: Bottom Navbar, Today View, Bottom Sheet
   ======================================== */

(function() {
    'use strict';

    // === DOM Elements ===
    const bottomNavbar = document.getElementById('bottomNavbar');
    const navToday = document.getElementById('navToday');
    const navFull = document.getElementById('navFull');
    const bottomMenuBtn = document.getElementById('bottomMenuBtn');
    const navShortcut1 = document.getElementById('navShortcut1');
    const navShortcut2 = document.getElementById('navShortcut2');
    
    const todayView = document.getElementById('todayView');
    const todayCards = document.getElementById('todayCards');
    const todayEmpty = document.getElementById('todayEmpty');
    const todayDate = document.getElementById('todayDate');
    
    const bottomSheet = document.getElementById('bottomSheet');
    const bottomSheetOverlay = document.getElementById('bottomSheetOverlay');
    
    const timetableWrapper = document.querySelector('.timetable-wrapper');
    const titleContainer = document.querySelector('.title-container');
    
    // Bottom sheet menu buttons
    const sheetCustomizationBtn = document.getElementById('sheetCustomizationBtn');
    const sheetWeatherBtn = document.getElementById('sheetWeatherBtn');
    const sheetManualsBtn = document.getElementById('sheetManualsBtn');
    const sheetClockBtn = document.getElementById('sheetClockBtn');
    const sheetTodoBtn = document.getElementById('sheetTodoBtn');
    const sheetInfoBtn = document.getElementById('sheetInfoBtn');
    
    // Mobile Header Elements
    const mobileHeaderTime = document.getElementById('mobileHeaderTime');
    const mobileHeaderDate = document.getElementById('mobileHeaderDate');

    // === Timetable Data ===
    const dayMap = {
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday'
    };
    let dynamicScheduleData = null;
    let manualMap = {};

    async function loadDynamicSchedule() {
        const dataPath = window.DATA_PATH || '../data/';
        const classId = window.CLASS_ID || '8d';
        try {
            const [ttResponse, manualResponse] = await Promise.all([
                fetch(`${dataPath}${classId}.json`),
                fetch(`${dataPath}manuals.json`)
            ]);
            
            const data = await ttResponse.json();
            dynamicScheduleData = data.schedule;

            const manuals = await manualResponse.json();
            manuals.forEach(m => {
                if (m.subject) {
                    manualMap[m.subject.toLowerCase()] = m.link;
                }
            });

            return true;
        } catch (error) {
            console.error("Error loading data for today view:", error);
            return false;
        }
    }

    function normalizeSubject(text) {
        if (!text) return "";
        // Remove emojis and special characters for lookup
        const withoutEmojis = text.replace(
            /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu, ""
        );
        return withoutEmojis.replace(/[^0-9\p{L}\s\-]+/gu, "").trim().toLowerCase();
    }

    // === Shortcut Configuration ===
    const shortcutIcons = {
        customization: 'fa-solid fa-sliders',
        weather: 'fa-solid fa-cloud-sun',
        textbooks: 'fa-solid fa-book',
        clock: 'fa-solid fa-clock',
        tasks: 'fa-solid fa-list-check',
        info: 'fa-solid fa-circle-info'
    };

    const shortcutLabels = {
        customization: 'Custom',
        weather: 'Weather',
        textbooks: 'Books',
        clock: 'Clock',
        tasks: 'Tasks',
        info: 'Info'
    };

    // === Helper Functions ===
    function getAdvancedSettings() {
        try {
            return JSON.parse(localStorage.getItem('advancedSettings') || '{}');
        } catch {
            return {};
        }
    }

    function getCurrentTime() {
        const now = new Date();
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            day: now.getDay() // 0 = Sunday
        };
    }

    function formatDate(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    }

    function getClassStatus(classTime) {
        const { hours, minutes } = getCurrentTime();
        const currentMinutes = hours * 60 + minutes;
        const [classHour] = classTime.split(':').map(Number);
        const classMinutes = classHour * 60;
        const classEndMinutes = classMinutes + 50; // Assuming 50-min classes

        if (currentMinutes >= classMinutes && currentMinutes < classEndMinutes) {
            return 'current';
        } else if (currentMinutes >= classEndMinutes) {
            return 'past';
        }
        return 'future';
    }

    // === View Management ===
    function showTodayView() {
        if (!todayView) return;
        
        // Update nav state
        navToday.classList.add('active');
        navFull.classList.remove('active');
        
        // Show today view, hide timetable
        todayView.classList.add('active');
        
        // Hide other main containers only if we are on mobile
        if (window.innerWidth <= 768) {
            if (timetableWrapper) timetableWrapper.style.display = 'none';
            // Note: We no longer hide titleContainer as it's replaced by sticky header on mobile
        }
        
        // Populate cards
        populateTodayCards();
    }

    function showFullView() {
        if (!todayView) return;
        
        // Update nav state
        navFull.classList.add('active');
        navToday.classList.remove('active');
        
        // Show timetable, hide today view
        todayView.classList.remove('active');
        
        if (timetableWrapper) timetableWrapper.style.display = '';
        // Note: We no longer toggle titleContainer
    }

    function populateTodayCards() {
        if (!todayCards || !todayDate) return;
        
        const { day } = getCurrentTime();
        
        // Update date display
        todayDate.textContent = formatDate(new Date());
        
        // Clear existing cards
        todayCards.innerHTML = '';
        
        if (!dynamicScheduleData) {
            // Data not loaded yet, try to load it
            loadDynamicSchedule().then(success => {
                if (success) populateTodayCards();
            });
            return;
        }

        const dayName = dayMap[day];

        if (!dayName) {
            // Weekend or no mapping
            todayCards.style.display = 'none';
            if (todayEmpty) todayEmpty.classList.add('active');
            return;
        }

        // Filter and transform dynamic data for today
        const todaySchedule = dynamicScheduleData
            .filter(row => row[dayName])
            .map(row => {
                const subjectObj = row[dayName];
                let emoji = subjectObj.emoji || '';
                if (subjectObj.flag) {
                    emoji = `<span class="${subjectObj.flag}" style="border-radius: var(--border-radius-sm);"></span>`;
                }
                return {
                    time: row.time,
                    subject: subjectObj.name,
                    emoji: emoji
                };
            });
        
        if (todaySchedule.length === 0) {
            // No classes for this day
            todayCards.style.display = 'none';
            if (todayEmpty) todayEmpty.classList.add('active');
            return;
        }
        
        todayCards.style.display = 'flex';
        if (todayEmpty) todayEmpty.classList.remove('active');
        
        todaySchedule.forEach((cls, index) => {
            const status = getClassStatus(cls.time);
            const card = document.createElement('div');
            card.className = `today-card ${status}`;
            card.style.animationDelay = `${index * 0.05}s`;
            
            const periodNum = index + 1;
            
            card.innerHTML = `
                <div class="today-card-time">
                    <div class="time">${cls.time}</div>
                    <div class="period">Period ${periodNum}</div>
                </div>
                <div class="today-card-emoji">${cls.emoji}</div>
                <div class="today-card-subject">${cls.subject}</div>
            `;
            
            // Interaction Logic
            card.addEventListener('click', () => {
                const mode = getAdvancedSettings().interactionMode || 'link';
                if (mode === 'mark') {
                    card.classList.toggle('marked-subject');
                } else {
                    const normalized = normalizeSubject(cls.subject);
                    const found = manualMap[normalized] || manualMap[normalized.split(' ')[0]];
                    if (found) {
                        window.open(found, '_blank');
                    } else {
                        window.open(`https://manuale.edu.ro/?s=${encodeURIComponent(normalized)}`, '_blank');
                    }
                }
            });
            
            todayCards.appendChild(card);
        });
    }

    // === Bottom Sheet ===
    function openBottomSheet() {
        if (!bottomSheet || !bottomSheetOverlay) return;
        bottomSheet.classList.add('active');
        bottomSheetOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeBottomSheet() {
        if (!bottomSheet || !bottomSheetOverlay) return;
        bottomSheet.classList.remove('active');
        bottomSheetOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // === Shortcut Handling ===
    function triggerShortcut(shortcutType) {
        closeBottomSheet();
        
        switch(shortcutType) {
            case 'customization':
                document.getElementById('customizationBtn')?.click();
                break;
            case 'weather':
                document.getElementById('weatherBtn')?.click();
                break;
            case 'textbooks':
                document.getElementById('allManualsBtn')?.click();
                break;
            case 'clock':
                document.getElementById('clockBtn')?.click();
                break;
            case 'tasks':
                document.getElementById('todoBtn')?.click();
                break;
            case 'info':
                document.getElementById('infoBtn')?.click();
                break;
        }
    }

    function updateShortcutButtons() {
        const settings = getAdvancedSettings();
        const shortcut1 = settings.shortcut1 || 'customization';
        const shortcut2 = settings.shortcut2 || 'weather';
        
        if (navShortcut1) {
            navShortcut1.querySelector('i').className = shortcutIcons[shortcut1];
            navShortcut1.querySelector('span').textContent = shortcutLabels[shortcut1];
            navShortcut1.dataset.shortcutType = shortcut1;
        }
        
        if (navShortcut2) {
            navShortcut2.querySelector('i').className = shortcutIcons[shortcut2];
            navShortcut2.querySelector('span').textContent = shortcutLabels[shortcut2];
            navShortcut2.dataset.shortcutType = shortcut2;
        }
    }

    // === Event Listeners ===
    
    // Bottom navbar navigation
    navToday?.addEventListener('click', showTodayView);
    navFull?.addEventListener('click', showFullView);
    bottomMenuBtn?.addEventListener('click', openBottomSheet);
    
    // Shortcut buttons
    navShortcut1?.addEventListener('click', () => {
        const type = navShortcut1.dataset.shortcutType || 'customization';
        triggerShortcut(type);
    });
    
    navShortcut2?.addEventListener('click', () => {
        const type = navShortcut2.dataset.shortcutType || 'weather';
        triggerShortcut(type);
    });
    
    // Bottom sheet overlay click to close
    bottomSheetOverlay?.addEventListener('click', closeBottomSheet);
    
    // Bottom sheet menu buttons
    sheetCustomizationBtn?.addEventListener('click', () => triggerShortcut('customization'));
    sheetWeatherBtn?.addEventListener('click', () => triggerShortcut('weather'));
    sheetManualsBtn?.addEventListener('click', () => triggerShortcut('textbooks'));
    sheetClockBtn?.addEventListener('click', () => triggerShortcut('clock'));
    sheetTodoBtn?.addEventListener('click', () => triggerShortcut('tasks'));
    sheetInfoBtn?.addEventListener('click', () => triggerShortcut('info'));
    
    // Ensure no click listener on the handle itself causes accidental closing
    
    // Swipe down to close bottom sheet
    let touchStartY = 0;
    bottomSheet?.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    bottomSheet?.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const diff = touchY - touchStartY;
        
        if (diff > 50) {
            closeBottomSheet();
        }
    }, { passive: true });

    // === Weather Sync ===
    function syncWeatherToSheet() {
        const menuEmoji = document.getElementById('menuWeatherEmoji');
        const menuTemp = document.getElementById('menuWeatherTemp');
        const sheetEmoji = document.getElementById('sheetWeatherEmoji');
        const sheetTemp = document.getElementById('sheetWeatherTemp');
        
        if (menuEmoji && sheetEmoji) {
            sheetEmoji.textContent = menuEmoji.textContent;
        }
        if (menuTemp && sheetTemp) {
            sheetTemp.textContent = menuTemp.textContent;
        }
    }

    // Observe weather changes
    const weatherObserver = new MutationObserver(syncWeatherToSheet);
    const menuWeatherEmoji = document.getElementById("menuWeatherEmoji");
    if (menuWeatherEmoji) {
        weatherObserver.observe(menuWeatherEmoji, { characterData: true, childList: true, subtree: true });
    }

    // === Mobile Header Update ===
    function updateMobileHeader() {
        if (!mobileHeaderTime || !mobileHeaderDate) return;
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        mobileHeaderTime.textContent = `${hours}:${minutes}`;
        
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        mobileHeaderDate.textContent = now.toLocaleDateString('ro-RO', options);
    }
    
    // === Scroll Behavior (Hide Nav) ===
    let lastScrollTop = 0;
    function handleScroll() {
        if (!document.body.classList.contains('mobile-nav-scroll')) {
            if (bottomNavbar) bottomNavbar.style.transform = '';
            return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            if (bottomNavbar) bottomNavbar.style.transform = 'translateY(100%)';
        } else {
            // Scrolling up
            if (bottomNavbar) bottomNavbar.style.transform = 'translateY(0)';
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    // === Initialization ===
    function init() {
        updateShortcutButtons();
        syncWeatherToSheet();
        updateMobileHeader();
        setInterval(updateMobileHeader, 1000);
        
        // Default to Today view on mobile
        if (window.innerWidth <= 768) {
            showTodayView();
        } else {
            // Ensure full view is reset on desktop resize
            showFullView();
        }
        
        // Handle resize events to switch views if needed
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                showFullView();
            }
        });
        
        // Refresh today view periodically
        setInterval(() => {
            if (todayView?.classList.contains('active')) {
                populateTodayCards();
            }
        }, 300000); // Every 5 minutes
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await loadDynamicSchedule();
            init();
        });
    } else {
        (async () => {
            await loadDynamicSchedule();
            init();
        })();
    }

    // Export for external use
    window.mobileNav = {
        showTodayView,
        showFullView,
        openBottomSheet,
        closeBottomSheet,
        updateShortcutButtons
    };

})();
