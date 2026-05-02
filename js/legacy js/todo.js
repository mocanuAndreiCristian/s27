
/* ========================================
   ADVANCED TODO SYSTEM - COMPLETE REWRITE
   ======================================== */

(function() {
    'use strict';

    // === STORAGE KEYS ===
    const STORAGE = {
        TASKS: 'adv-todo-tasks',
        FOLDERS: 'adv-todo-folders',
        NOTIFIED: 'adv-todo-notified',
        SETTINGS: 'adv-todo-settings'
    };

    // === ICONS ===
    const FOLDER_ICONS = [
        'fa-folder', 'fa-briefcase', 'fa-home', 'fa-heart', 'fa-star',
        'fa-graduation-cap', 'fa-book', 'fa-shopping-cart', 'fa-utensils', 'fa-dumbbell',
        'fa-plane', 'fa-palette', 'fa-music', 'fa-gamepad', 'fa-film',
        'fa-camera', 'fa-car', 'fa-coffee', 'fa-gift', 'fa-lightbulb',
        'fa-rocket', 'fa-umbrella', 'fa-key', 'fa-bell', 'fa-flag',
        'fa-chart-line', 'fa-code', 'fa-laptop', 'fa-mobile', 'fa-headphones',
        'fa-bicycle', 'fa-tree', 'fa-paw', 'fa-hammer', 'fa-wrench',
        'fa-flask', 'fa-trophy', 'fa-medal', 'fa-fire', 'fa-snowflake'
    ];

    // === STATE ===
    let tasks = [];
    let folders = [];
    let notifiedTasks = new Set();
    
    // View State
    let currentFilter = 'all';
    let currentSort = 'manual';
    let currentFolder = null;
    let currentView = 'list';
    let currentCalendarMonth = new Date();
    
    // Edit State
    let editingTaskId = null;
    let editingFolderId = null;
    let currentPriority = 'medium';
    let currentDifficulty = 'medium';
    
    // Temporary Edit State (for lists in modal)
    let tempAttachments = [];
    let tempReminders = [];
    let tempSubtasks = [];

    let draggedTask = null;
    let searchTerm = '';
    let activeFilters = {
        priority: ['very-high', 'high', 'medium', 'low', 'very-low'],
        status: ['pending', 'completed']
    };

    // === INITIALIZATION ===
    function init() {
        loadData();
        setupEventListeners();
        renderFolders();
        renderTasks();
        renderIconPicker();
        updateStats();
        startNotificationCheck();
        requestNotificationPermission();
        renderCalendar(); // Initial calendar render
    }

    // === DATA MANAGEMENT ===
    function loadData() {
        try {
            tasks = JSON.parse(localStorage.getItem(STORAGE.TASKS) || '[]');
            folders = JSON.parse(localStorage.getItem(STORAGE.FOLDERS) || '[]');
            notifiedTasks = new Set(JSON.parse(localStorage.getItem(STORAGE.NOTIFIED) || '[]'));
        } catch (e) {
            console.error('Error loading data:', e);
            tasks = [];
            folders = [];
            notifiedTasks = new Set();
        }

        // Ensure default folders exist
        if (folders.length === 0) {
            folders = [
                { id: generateId(), name: 'Personal', description: 'Personal tasks', color: '#6196ff', icon: 'fa-home', order: 0 },
                { id: generateId(), name: 'Work', description: 'School/Work tasks', color: '#ef4444', icon: 'fa-briefcase', order: 1 },
                { id: generateId(), name: 'Shopping', description: 'Groceries etc.', color: '#10b981', icon: 'fa-shopping-cart', order: 2 }
            ];
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE.TASKS, JSON.stringify(tasks));
        localStorage.setItem(STORAGE.FOLDERS, JSON.stringify(folders));
        localStorage.setItem(STORAGE.NOTIFIED, JSON.stringify([...notifiedTasks]));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // === NOTIFICATIONS ===
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function sendNotification(title, body, tag) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/762/762674.png',
                tag: tag
            });
        }
    }

    function checkNotifications() {
        const now = new Date();
        tasks.forEach(task => {
            if (task.completed) return;

            // Check reminders
            if (task.reminders) {
                task.reminders.forEach((reminder, index) => {
                    const reminderTime = new Date(reminder);
                    const diff = reminderTime - now;
                    // Trigger if within last minute and not notified
                    const reminderKey = `${task.id}-reminder-${index}-${reminderTime.getTime()}`;
                    
                    if (diff <= 0 && diff > -60000 && !notifiedTasks.has(reminderKey)) {
                        sendNotification('🔔 Reminder', `Time for: "${task.title}"`, reminderKey);
                        notifiedTasks.add(reminderKey);
                        saveData();
                    }
                });
            }
        });
    }

    function startNotificationCheck() {
        setInterval(checkNotifications, 10000); // Check every 10 seconds
    }

    // === STATS & UI UPDATES ===
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;

        const setStat = (id, val) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = val;
                el.style.animation = 'none';
                el.offsetHeight; /* trigger reflow */
                el.style.animation = 'numberPop 0.3s ease';
            }
        };

        setStat('statTotal', total);
        setStat('statCompleted', completed);
        setStat('statPending', pending);

        // Update folder counts
        folders.forEach(folder => {
            const count = tasks.filter(t => t.folderId === folder.id).length;
            const folderEl = document.querySelector(`[data-folder-id="${folder.id}"]`);
            if (folderEl) {
                const countEl = folderEl.querySelector('.folder-count');
                if (countEl) countEl.textContent = `${count} tasks`;
            }
        });

        // Update view title count
        const currentCount = document.getElementById('currentTaskCount');
        const filteredTasks = getFilteredTasks();
        if (currentCount) {
            currentCount.textContent = `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}`;
        }
    }

    function updateFolderDropdown() {
        const select = document.getElementById('editTaskFolder');
        if (!select) return;
        select.innerHTML = '<option value="">No Folder</option>';
        folders.forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.name;
            select.appendChild(option);
        });
    }

    function renderIconPicker() {
        const grid = document.getElementById('iconPickerGrid');
        if (!grid) return;
        
        grid.innerHTML = FOLDER_ICONS.map(icon => `
            <div class="icon-option" data-icon="${icon}">
                <i class="fa-solid ${icon}"></i>
            </div>
        `).join('');

        grid.querySelectorAll('.icon-option').forEach(opt => {
            opt.addEventListener('click', () => {
                grid.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    // === FOLDER LOGIC ===
    function renderFolders() {
        const container = document.getElementById('foldersList');
        if (!container) return;

        container.innerHTML = folders.map(folder => `
            <div class="folder-item ${currentFolder === folder.id ? 'active' : ''}" 
                 data-folder-id="${folder.id}"
                 style="--folder-color: ${folder.color};">
                <i class="fa-solid ${folder.icon} folder-icon"></i>
                <div class="folder-item-text">
                    <div class="folder-name">${folder.name}</div>
                    <div class="folder-count">${tasks.filter(t => t.folderId === folder.id).length} tasks</div>
                </div>
                <div class="folder-actions">
                    <button class="folder-action-btn edit-folder" data-id="${folder.id}">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="folder-action-btn delete-folder" data-id="${folder.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Listeners
        container.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.folder-actions')) return;
                selectFolder(item.dataset.folderId);
            });
        });

        container.querySelectorAll('.edit-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditFolder(btn.dataset.id);
            });
        });

        container.querySelectorAll('.delete-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFolder(btn.dataset.id);
            });
        });
    }

    function selectFolder(folderId) {
        if (currentFolder === folderId) {
            currentFolder = null; // Toggle off
            document.getElementById('currentViewTitle').textContent = 'All Tasks';
        } else {
            currentFolder = folderId;
            const folder = folders.find(f => f.id === folderId);
            document.getElementById('currentViewTitle').textContent = folder ? folder.name : 'Tasks';
        }
        currentFilter = 'all'; // Reset filter when changing folder
        
        // Update UI states
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.folderId === currentFolder);
        });
        document.querySelectorAll('.quick-filter').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.quick-filter[data-filter="all"]').classList.add('active');

        renderTasks();
    }

    function openAddFolder() {
        editingFolderId = null;
        const modal = document.getElementById('folderEditModal');
        document.getElementById('folderEditTitle').innerHTML = '<i class="fa-solid fa-folder-plus"></i> New Folder';
        document.getElementById('editFolderName').value = '';
        document.getElementById('editFolderDescription').value = '';
        
        // Reset styles
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        document.querySelector('.color-option[data-color="#6196ff"]').classList.add('active');
        
        document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
        document.querySelector('.icon-option[data-icon="fa-folder"]').classList.add('active');

        if (modal) modal.classList.add('active');
    }

    function openEditFolder(id) {
        const folder = folders.find(f => f.id === id);
        if (!folder) return;

        editingFolderId = id;
        const modal = document.getElementById('folderEditModal');
        document.getElementById('folderEditTitle').innerHTML = '<i class="fa-solid fa-folder-pen"></i> Edit Folder';
        document.getElementById('editFolderName').value = folder.name;
        document.getElementById('editFolderDescription').value = folder.description || '';

        document.querySelectorAll('.color-option').forEach(o => {
            o.classList.toggle('active', o.dataset.color === folder.color);
        });

        document.querySelectorAll('.icon-option').forEach(o => {
            o.classList.toggle('active', o.dataset.icon === folder.icon);
        });

        if (modal) modal.classList.add('active');
    }

    function saveFolder() {
        const name = document.getElementById('editFolderName').value.trim();
        const desc = document.getElementById('editFolderDescription').value.trim();
        const colorBtn = document.querySelector('.color-option.active');
        const iconBtn = document.querySelector('.icon-option.active');
        
        if (!name) return alert("Folder name is required.");

        const color = colorBtn ? colorBtn.dataset.color : '#6196ff';
        const icon = iconBtn ? iconBtn.dataset.icon : 'fa-folder';

        if (editingFolderId) {
            const folder = folders.find(f => f.id === editingFolderId);
            if (folder) {
                folder.name = name;
                folder.description = desc;
                folder.color = color;
                folder.icon = icon;
            }
        } else {
            folders.push({
                id: generateId(),
                name,
                description: desc,
                color,
                icon,
                order: folders.length
            });
        }
        
        saveData();
        renderFolders();
        renderTasks(); // Update badges
        updateFolderDropdown();
        document.getElementById('folderEditModal').classList.remove('active');
    }

    function deleteFolder(id) {
        if (!confirm("Delete this folder and its tasks?")) return;
        folders = folders.filter(f => f.id !== id);
        tasks = tasks.filter(t => t.folderId !== id); // Cascade delete
        if (currentFolder === id) {
            currentFolder = null;
            document.getElementById('currentViewTitle').textContent = 'All Tasks';
        }
        saveData();
        renderFolders();
        renderTasks();
        updateStats();
    }

    // === TASK LOGIC ===
    function getFilteredTasks() {
        let filtered = [...tasks];

        // 1. Folder
        if (currentFolder) {
            filtered = filtered.filter(t => t.folderId === currentFolder);
        }

        // 2. Quick Filters
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate() + 1);
        const weekEnd = new Date(todayStart); weekEnd.setDate(todayStart.getDate() + 7);

        switch (currentFilter) {
            case 'today':
                filtered = filtered.filter(t => {
                    if (!t.dueDate) return false;
                    const d = new Date(t.dueDate);
                    return d >= todayStart && d < tomorrowStart;
                });
                break;
            case 'week':
                filtered = filtered.filter(t => {
                    if (!t.dueDate) return false;
                    const d = new Date(t.dueDate);
                    return d >= todayStart && d <= weekEnd;
                });
                break;
            case 'overdue':
                filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate) < now && !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
        }

        // 3. Status & Priority Checkboxes
        filtered = filtered.filter(t => {
            const pMatch = activeFilters.priority.includes(t.priority);
            const sMatch = activeFilters.status.includes(t.completed ? 'completed' : 'pending');
            return pMatch && sMatch;
        });

        // 4. Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => t.title.toLowerCase().includes(term));
        }

        return filtered;
    }

    function sortTasks(taskList) {
        if (currentSort === 'manual') {
            return taskList.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        const pMap = { 'very-high': 0, 'high': 1, 'medium': 2, 'low': 3, 'very-low': 4 };
        
        return taskList.sort((a, b) => {
            if (currentSort === 'priority') return pMap[a.priority] - pMap[b.priority];
            if (currentSort === 'dueDate') {
                if (!a.dueDate) return 1; 
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (currentSort === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
            if (currentSort === 'name') return a.title.localeCompare(b.title);
            return 0;
        });
    }

    function renderTasks() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        if (!container) return;

        const filtered = getFilteredTasks();
        const sorted = sortTasks(filtered);

        if (sorted.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.add('active');
        } else {
            if (emptyState) emptyState.classList.remove('active');
            container.innerHTML = sorted.map((task, index) => {
                const folder = folders.find(f => f.id === task.folderId);
                const pColor = {
                    'very-high': '#dc2626', 'high': '#ea580c', 'medium': '#f59e0b', 'low': '#10b981', 'very-low': '#3b82f6'
                }[task.priority];
                
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
                const dateStr = task.dueDate ? new Date(task.dueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '';
                
                const doneSub = (task.subtasks || []).filter(s => s.completed).length;
                const totalSub = (task.subtasks || []).length;

                return `
                <div class="task-item ${task.completed ? 'completed' : ''}" 
                     data-task-id="${task.id}" 
                     draggable="${currentSort === 'manual'}"
                     style="--priority-color: ${pColor}; animation-delay: ${index * 0.05}s">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="task-header">
                            <span class="task-priority" style="color: ${pColor}"><i class="fa-solid fa-flag"></i></span>
                            <div class="task-title">${task.title}</div>
                        </div>
                        <div class="task-meta">
                            ${folder ? `<span class="task-folder-badge" style="background: ${folder.color}; color: white;"><i class="fa-solid ${folder.icon}"></i> ${folder.name}</span>` : ''}
                            <span class="task-difficulty">${task.difficulty || 'medium'}</span>
                            ${task.dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}"><i class="fa-solid fa-calendar"></i> ${dateStr}</span>` : ''}
                            ${totalSub > 0 ? `<span class="task-subtasks-indicator"><i class="fa-solid fa-list-check"></i> ${doneSub}/${totalSub}</span>` : ''}
                            ${task.repeating ? '<i class="fa-solid fa-repeat" title="Repeats"></i>' : ''}
                            ${(task.attachments || []).length > 0 ? `<i class="fa-solid fa-paperclip" title="Attachments"></i>` : ''}
                            ${(task.reminders || []).length > 0 ? `<i class="fa-solid fa-bell" title="Reminders"></i>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn edit-task" data-id="${task.id}"><i class="fa-solid fa-pencil"></i></button>
                        <button class="task-action-btn delete delete-task" data-id="${task.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }

        // Add Listeners
        container.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleTaskComplete(e.target.closest('.task-item').dataset.taskId);
            });
        });

        container.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditTask(btn.dataset.id);
            });
        });

        container.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(btn.dataset.id);
            });
        });

        // Drag & Drop
        if (currentSort === 'manual') {
            const items = container.querySelectorAll('.task-item');
            items.forEach(item => {
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragover', handleDragOver);
                item.addEventListener('drop', handleDrop);
                item.addEventListener('dragend', handleDragEnd);
            });
        }
        
        // Render calendar events too if view is active
        if (currentView === 'calendar') renderCalendar();
    }

    // === TASK OPERATIONS ===
    function toggleTaskComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        
        // Handle repeating logic if marked complete
        if (task.completed && task.repeating) {
            createRepeatingInstance(task);
        }
        
        saveData();
        renderTasks();
        updateStats();
    }

    function createRepeatingInstance(original) {
        if (!original.repeatInterval) return;
        
        const newDate = new Date(original.dueDate || Date.now());
        switch (original.repeatInterval) {
            case 'daily': newDate.setDate(newDate.getDate() + 1); break;
            case 'weekly': newDate.setDate(newDate.getDate() + 7); break;
            case 'biweekly': newDate.setDate(newDate.getDate() + 14); break;
            case 'monthly': newDate.setMonth(newDate.getMonth() + 1); break;
            case 'yearly': newDate.setFullYear(newDate.getFullYear() + 1); break;
        }

        const newTask = {
            ...original,
            id: generateId(),
            completed: false,
            dueDate: newDate.toISOString().slice(0, 16),
            createdAt: new Date().toISOString(),
            order: 0, // Top of list
            // Subtasks reset
            subtasks: (original.subtasks || []).map(s => ({ ...s, completed: false }))
        };

        // Shift orders down
        tasks.forEach(t => t.order++);
        tasks.unshift(newTask);
        saveData();
    }

    function deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        tasks = tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
        updateStats();
    }

    // === ADD / EDIT TASK MODALS ===
    function openAddTask() {
        editingTaskId = null;
        document.getElementById('taskEditTitle').innerHTML = '<i class="fa-solid fa-plus"></i> New Task';
        
        // Reset Inputs
        document.getElementById('editTaskTitle').value = '';
        document.getElementById('editTaskFolder').value = currentFolder || '';
        document.getElementById('editTaskDescription').value = '';
        document.getElementById('editTaskDifficulty').value = 'medium';
        document.getElementById('editTaskDueDate').value = '';
        document.getElementById('editTaskRepeating').checked = false;
        document.getElementById('repeatingOptions').style.display = 'none';
        document.getElementById('editTaskRepeatInterval').value = 'daily';

        // Reset Priority
        currentPriority = 'medium';
        document.querySelectorAll('.priority-flag').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === 'medium');
        });

        // Reset Temp Lists
        tempAttachments = [];
        tempReminders = [];
        tempSubtasks = [];
        renderTempAttachments();
        renderTempReminders();
        renderTempSubtasks();

        updateFolderDropdown();
        document.getElementById('taskEditModal').classList.add('active');
    }

    function openEditTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        editingTaskId = id;
        document.getElementById('taskEditTitle').innerHTML = '<i class="fa-solid fa-pencil"></i> Edit Task';

        document.getElementById('editTaskTitle').value = task.title;
        updateFolderDropdown();
        document.getElementById('editTaskFolder').value = task.folderId || '';
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskDifficulty').value = task.difficulty || 'medium';
        document.getElementById('editTaskDueDate').value = task.dueDate || '';
        document.getElementById('editTaskRepeating').checked = task.repeating || false;
        document.getElementById('repeatingOptions').style.display = task.repeating ? 'block' : 'none';
        document.getElementById('editTaskRepeatInterval').value = task.repeatInterval || 'daily';

        currentPriority = task.priority;
        document.querySelectorAll('.priority-flag').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === task.priority);
        });

        // Load Temp Lists
        tempAttachments = [...(task.attachments || [])];
        tempReminders = [...(task.reminders || [])];
        tempSubtasks = [...(task.subtasks || [])];
        renderTempAttachments();
        renderTempReminders();
        renderTempSubtasks();

        document.getElementById('taskEditModal').classList.add('active');
    }

    function saveTask() {
        const title = document.getElementById('editTaskTitle').value.trim();
        if (!title) return alert('Task title is required');

        const folderId = document.getElementById('editTaskFolder').value;
        const desc = document.getElementById('editTaskDescription').value.trim();
        const diff = document.getElementById('editTaskDifficulty').value;
        const due = document.getElementById('editTaskDueDate').value;
        const repeating = document.getElementById('editTaskRepeating').checked;
        const interval = document.getElementById('editTaskRepeatInterval').value;

        if (editingTaskId) {
            const task = tasks.find(t => t.id === editingTaskId);
            if (task) {
                task.title = title;
                task.folderId = folderId;
                task.description = desc;
                task.priority = currentPriority;
                task.difficulty = diff;
                task.dueDate = due;
                task.repeating = repeating;
                task.repeatInterval = interval;
                task.attachments = tempAttachments;
                task.reminders = tempReminders;
                task.subtasks = tempSubtasks;
            }
        } else {
            const newTask = {
                id: generateId(),
                title,
                folderId,
                description: desc,
                priority: currentPriority,
                difficulty: diff,
                dueDate: due,
                repeating,
                repeatInterval: interval,
                attachments: tempAttachments,
                reminders: tempReminders,
                subtasks: tempSubtasks,
                completed: false,
                createdAt: new Date().toISOString(),
                order: 0
            };
            // Shift existing orders
            tasks.forEach(t => t.order++);
            tasks.unshift(newTask);
        }

        saveData();
        renderTasks();
        updateStats();
        document.getElementById('taskEditModal').classList.remove('active');
    }

    // === TEMP LIST RENDERING (Modal) ===
    function renderTempAttachments() {
        const list = document.getElementById('attachmentsList');
        if (!list) return;
        list.innerHTML = tempAttachments.map((att, i) => `
            <div class="attachment-item">
                <i class="fa-solid fa-file attachment-icon"></i>
                <span class="attachment-name">${att.name}</span>
                <button class="attachment-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        list.querySelectorAll('.attachment-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                tempAttachments.splice(btn.dataset.index, 1);
                renderTempAttachments();
            });
        });
    }

    function renderTempReminders() {
        const list = document.getElementById('remindersList');
        if (!list) return;
        list.innerHTML = tempReminders.map((rem, i) => {
            const dateStr = new Date(rem).toLocaleString();
            return `
            <div class="reminder-item">
                <span class="reminder-time"><i class="fa-solid fa-clock"></i> ${dateStr}</span>
                <button class="reminder-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
        }).join('');

        list.querySelectorAll('.reminder-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                tempReminders.splice(btn.dataset.index, 1);
                renderTempReminders();
            });
        });
    }

    function renderTempSubtasks() {
        const list = document.getElementById('subtasksList');
        if (!list) return;
        list.innerHTML = tempSubtasks.map((st, i) => `
            <div class="subtask-item ${st.completed ? 'completed' : ''}">
                <input type="checkbox" ${st.completed ? 'checked' : ''} data-index="${i}">
                <span class="subtask-text">${st.title}</span>
                <button class="subtask-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                tempSubtasks[e.target.dataset.index].completed = e.target.checked;
                renderTempSubtasks();
            });
        });

        list.querySelectorAll('.subtask-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                tempSubtasks.splice(btn.dataset.index, 1);
                renderTempSubtasks();
            });
        });
    }

    // === DRAG AND DROP ===
    function handleDragStart(e) {
        draggedTask = this;
        e.dataTransfer.effectAllowed = 'move';
        this.classList.add('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const container = document.getElementById('tasksContainer');
        const afterElement = getDragAfterElement(container, e.clientY);
        
        if (afterElement == null) {
            container.appendChild(draggedTask);
        } else {
            container.insertBefore(draggedTask, afterElement);
        }
    }

    function handleDrop(e) {
        e.stopPropagation();
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        draggedTask = null;
        
        // Update order in array
        const container = document.getElementById('tasksContainer');
        const items = [...container.querySelectorAll('.task-item')];
        items.forEach((item, index) => {
            const id = item.dataset.taskId;
            const task = tasks.find(t => t.id === id);
            if (task) task.order = index;
        });
        saveData();
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // === CALENDAR VIEW ===
    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const monthLabel = document.getElementById('calendarMonth');
        if (!grid || !monthLabel) return;

        const year = currentCalendarMonth.getFullYear();
        const month = currentCalendarMonth.getMonth();
        
        monthLabel.textContent = currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Logic to build calendar grid
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayIndex = (firstDay.getDay() + 6) % 7; // Mon = 0
        
        grid.innerHTML = '';

        // Add Day Headers
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(d => {
            const el = document.createElement('div');
            el.className = 'calendar-day-header';
            el.textContent = d;
            grid.appendChild(el);
        });

        // Empty cells for previous month
        for (let i = 0; i < startDayIndex; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day other-month';
            grid.appendChild(el);
        }

        const now = new Date();
        const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;

        for (let i = 1; i <= daysInMonth; i++) {
            const el = document.createElement('div');
            el.className = `calendar-day ${isCurrentMonth && i === now.getDate() ? 'today' : ''}`;
            
            // Find tasks for this day
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr) && !t.completed);
            
            el.innerHTML = `
                <div class="calendar-day-number">${i}</div>
                <div class="calendar-tasks">
                    ${dayTasks.slice(0, 4).map(t => {
                        const pColor = {
                            'very-high': '#dc2626', 'high': '#ea580c', 'medium': '#f59e0b', 'low': '#10b981', 'very-low': '#3b82f6'
                        }[t.priority];
                        return `<div class="calendar-task-dot" style="background: ${pColor}" title="${t.title}"></div>`;
                    }).join('')}
                    ${dayTasks.length > 4 ? `<div class="calendar-task-dot" style="background: #999" title="More..."></div>` : ''}
                </div>
            `;
            
            el.addEventListener('click', () => {
                // Filter view to this day
                // (Implementation specific: could switch to list view filtered by day)
            });
            
            grid.appendChild(el);
        }
    }

    // === EVENT LISTENERS SETUP ===
    function setupEventListeners() {
        // Overlay Controls
        const todoBtn = document.getElementById('todoBtn');
        const overlay = document.getElementById('advancedTodoOverlay');
        const closeBtn = document.getElementById('closeTodoOverlay');
        const sheetBtn = document.getElementById('sheetTodoBtn');

        const openOverlay = () => {
            if (window.overlayManager) {
                window.overlayManager.close('sideMenu');
                window.overlayManager.open('advancedTodoOverlay');
                overlay.classList.add('active'); // ensure CSS active class
            }
        };

        if (todoBtn) todoBtn.addEventListener('click', openOverlay);
        if (sheetBtn) sheetBtn.addEventListener('click', openOverlay);
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (window.overlayManager) window.overlayManager.close('advancedTodoOverlay');
                overlay.classList.remove('active');
            });
        }
        
        // Register with Overlay Manager
        if (window.overlayManager) {
            window.overlayManager.register('advancedTodoOverlay', {
                onClose: () => overlay.classList.remove('active')
            });
        }

        // Sidebar Toggle
        const sidebar = document.getElementById('todoSidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // Add Task Button
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) addTaskBtn.addEventListener('click', openAddTask);

        // Add Folder Button
        const addFolderBtn = document.getElementById('addFolderBtn');
        if (addFolderBtn) addFolderBtn.addEventListener('click', openAddFolder);

        // Search
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value;
                renderTasks();
            });
        }

        // View Switcher
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                
                document.getElementById('listView').classList.toggle('active', currentView === 'list');
                document.getElementById('calendarView').classList.toggle('active', currentView === 'calendar');
                
                if (currentView === 'calendar') renderCalendar();
            });
        });

        // Dropdowns (Sort/Filter)
        const setupDropdown = (btnId, menuId) => {
            const btn = document.getElementById(btnId);
            const menu = document.getElementById(menuId);
            if (btn && menu) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isActive = menu.classList.contains('active');
                    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
                    if (!isActive) menu.classList.add('active');
                });
            }
        };
        setupDropdown('sortBtn', 'sortMenu');
        setupDropdown('filterBtn', 'filterMenu');

        // Close dropdowns on click outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
        });

        // Sort Options
        document.querySelectorAll('.dropdown-item[data-sort]').forEach(item => {
            item.addEventListener('click', () => {
                currentSort = item.dataset.sort;
                renderTasks();
            });
        });

        // Filter Checkboxes
        document.querySelectorAll('input[data-filter]').forEach(cb => {
            cb.addEventListener('change', () => {
                const type = cb.dataset.filter;
                const val = cb.value;
                if (cb.checked) {
                    if (!activeFilters[type].includes(val)) activeFilters[type].push(val);
                } else {
                    activeFilters[type] = activeFilters[type].filter(v => v !== val);
                }
                renderTasks();
            });
        });

        // Quick Filters
        document.querySelectorAll('.quick-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                document.querySelectorAll('.quick-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Reset folder selection when using quick filters if desired, or keep combined
                renderTasks();
            });
        });

        // --- Modal Buttons ---
        
        // Task Edit
        document.getElementById('saveTaskEdit')?.addEventListener('click', saveTask);
        document.getElementById('cancelTaskEdit')?.addEventListener('click', () => {
            document.getElementById('taskEditModal').classList.remove('active');
        });
        document.getElementById('closeTaskEdit')?.addEventListener('click', () => {
            document.getElementById('taskEditModal').classList.remove('active');
        });

        // Priority Flags in Modal
        document.querySelectorAll('.priority-flag').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.priority-flag').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPriority = btn.dataset.priority;
            });
        });

        // Repeating Toggle
        document.getElementById('editTaskRepeating')?.addEventListener('change', (e) => {
            document.getElementById('repeatingOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        // Dynamic Lists Buttons in Modal
        document.getElementById('addAttachmentBtn')?.addEventListener('click', () => {
            // Simulation: In a real app this would upload file
            const name = prompt("Attachment Name (Simulation):");
            if (name) {
                tempAttachments.push({ name: name, url: '#' });
                renderTempAttachments();
            }
        });

        document.getElementById('addReminderBtn')?.addEventListener('click', () => {
            const time = prompt("Enter reminder time (YYYY-MM-DD HH:MM):", new Date().toISOString().slice(0, 16).replace('T', ' '));
            if (time) {
                const d = new Date(time);
                if (!isNaN(d.getTime())) {
                    tempReminders.push(d.toISOString());
                    renderTempReminders();
                } else {
                    alert("Invalid Date");
                }
            }
        });

        document.getElementById('addSubtaskBtn')?.addEventListener('click', () => {
            const input = document.getElementById('subtaskInput');
            const val = input.value.trim();
            if (val) {
                tempSubtasks.push({ title: val, completed: false });
                renderTempSubtasks();
                input.value = '';
            }
        });

        // Folder Edit
        document.getElementById('saveFolderEdit')?.addEventListener('click', saveFolder);
        document.getElementById('cancelFolderEdit')?.addEventListener('click', () => {
            document.getElementById('folderEditModal').classList.remove('active');
        });
        document.getElementById('closeFolderEdit')?.addEventListener('click', () => {
            document.getElementById('folderEditModal').classList.remove('active');
        });

        // Color Options
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Calendar Nav
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
            renderCalendar();
        });
        document.getElementById('nextMonth')?.addEventListener('click', () => {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
            renderCalendar();
        });
    }

    // Run Initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
