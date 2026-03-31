(function(){
    "use strict";

    const STORAGE = {
        THEME: 'customization-theme',
        ACCENT: 'customization-accent-color',
        FONT: 'customization-font'
    };

    let allProjects = [];
    let activeFilters = new Set();

    async function applySavedCustomization(){
        const themeId = localStorage.getItem(STORAGE.THEME) || 'auto';
        const accent = localStorage.getItem(STORAGE.ACCENT) || '#6196ff';
        const font = localStorage.getItem(STORAGE.FONT) || getComputedStyle(document.documentElement).getPropertyValue('--font-family') || "'Segoe UI', system-ui, sans-serif";

        document.documentElement.style.setProperty('--accent-color', accent);
        document.documentElement.style.setProperty('--font-family', font);
        document.querySelector('meta[name="theme-color"]').setAttribute('content', accent);

        let activeTheme = themeId;
        if (themeId === 'auto') {
            activeTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        try {
            const resp = await fetch('../data/themes.json');
            const data = await resp.json();
            const themeDef = (data.themes || []).find(t => t.id === activeTheme) || null;
            if (themeDef && themeDef.colors) {
                Object.entries(themeDef.colors).forEach(([k,v]) => {
                    document.documentElement.style.setProperty(k, v);
                });
            }
            document.documentElement.setAttribute('data-theme', activeTheme);
        } catch (e) {
            console.warn('Could not load themes.json', e);
            document.documentElement.setAttribute('data-theme', activeTheme);
        }
    }

    async function loadProjects(){
        try {
            const res = await fetch('projects.json');
            const data = await res.json();
            allProjects = data.projects || [];
            renderFilters();
            renderProjects(allProjects);
        } catch (e) {
            console.error('Failed to load projects.json', e);
            document.getElementById('projectsGrid').innerHTML = '<p>Unable to load projects list.</p>';
        }
    }

    function getUniqueSubjects(){
        const subjects = new Set();
        allProjects.forEach(p => {
            if (p.subject) subjects.add(p.subject);
        });
        return Array.from(subjects).sort();
    }

    function renderFilters(){
        const filtersList = document.getElementById('filtersList');
        filtersList.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.textContent = 'All';
        allBtn.addEventListener('click', () => {
            activeFilters.clear();
            updateFilters();
        });
        filtersList.appendChild(allBtn);

        getUniqueSubjects().forEach(subject => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
            btn.addEventListener('click', () => {
                if (activeFilters.has(subject)) {
                    activeFilters.delete(subject);
                } else {
                    activeFilters.clear();
                    activeFilters.add(subject);
                }
                updateFilters();
            });
            filtersList.appendChild(btn);
        });
    }

    function updateFilters(){
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            const isAll = btn.textContent === 'All';
            const subject = btn.textContent.toLowerCase();
            btn.classList.toggle('active', isAll ? activeFilters.size === 0 : activeFilters.has(subject));
        });
        applyFiltersAndSearch();
    }

    function applyFiltersAndSearch(){
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        let filtered = allProjects;

        if (activeFilters.size > 0) {
            filtered = filtered.filter(p => activeFilters.has(p.subject));
        }

        if (searchTerm) {
            filtered = filtered.filter(p => 
                (p.title && p.title.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            );
        }

        renderProjects(filtered);
    }

    function renderProjects(items){
        const grid = document.getElementById('projectsGrid');
        grid.innerHTML = '';
        if (!items.length) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No projects match your search or filters.</p>';
            return;
        }

        items.forEach(p => {
            const card = document.createElement('article');
            card.className = 'project-card';

            const img = document.createElement('img');
            img.className = 'project-thumb';
            img.alt = p.title + ' thumbnail';
            img.src = p.thumbnail || 'assets/placeholder.svg';

            const title = document.createElement('h3');
            title.className = 'project-title';
            title.textContent = p.title;

            const desc = document.createElement('p');
            desc.className = 'project-desc';
            desc.textContent = p.description || '';

            const actions = document.createElement('div');
            actions.className = 'project-actions';

            if (p.file) {
                const a = document.createElement('a');
                a.className = 'btn';
                a.href = p.file;
                a.setAttribute('download','');
                a.textContent = 'Download';
                actions.appendChild(a);
            }

            // Only show View button if page is not "#"
            if (p.page && p.page !== '#') {
                const v = document.createElement('a');
                v.className = 'btn secondary';
                v.href = p.page;
                v.target = '_blank';
                v.textContent = 'View';
                actions.appendChild(v);
            }

            card.appendChild(img);
            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(actions);

            grid.appendChild(card);
        });
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        applySavedCustomization();
        loadProjects();

        // Setup search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', applyFiltersAndSearch);
        }
    });

})();