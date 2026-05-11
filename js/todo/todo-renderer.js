import { PRIORITY_COLORS } from "./todo-constants.js";
import { filterTodoTasks, sortTodoTasks } from "./todo-filters.js";

export function getFilteredTasks(tasks, currentFolder, currentFilter, activeFilters, searchTerm) {
    return filterTodoTasks({
        tasks,
        currentFolder,
        currentFilter,
        activeFilters,
        searchTerm,
    });
}

export function sortTasks(taskList, currentSort) {
    return sortTodoTasks(taskList, currentSort);
}

export function renderTasks(
    tasks,
    folders,
    currentFolder,
    currentFilter,
    currentSort,
    activeFilters,
    searchTerm,
    currentView,
    onToggleComplete,
    onEditTask,
    onDeleteTask,
    onRenderCalendar
) {
    const container = document.getElementById("tasksContainer");
    const emptyState = document.getElementById("emptyState");
    if (!container) return;

    const filtered = getFilteredTasks(tasks, currentFolder, currentFilter, activeFilters, searchTerm);
    const sorted = sortTasks(filtered, currentSort);

    if (sorted.length === 0) {
        container.innerHTML = "";
        if (emptyState) emptyState.classList.add("active");
    } else {
        if (emptyState) emptyState.classList.remove("active");
        container.innerHTML = sorted
            .map((task, index) => {
                const folder = folders.find((f) => f.id === task.folderId);
                const pColor = PRIORITY_COLORS[task.priority];
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
                const dateStr = task.dueDate
                    ? new Date(task.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "";
                const doneSub = (task.subtasks || []).filter((s) => s.completed).length;
                const totalSub = (task.subtasks || []).length;

                return `
                <div class="task-item ${task.completed ? "completed" : ""}" 
                     data-task-id="${task.id}" 
                     draggable="${currentSort === "manual"}"
                     style="--priority-color: ${pColor}; animation-delay: ${index * 0.05}s">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
                    <div class="task-content">
                        <div class="task-header">
                            <span class="task-priority" style="color: ${pColor}"><i class="fa-solid fa-flag"></i></span>
                            <div class="task-title">${task.title}</div>
                        </div>
                        <div class="task-meta">
                            ${folder ? `<span class="task-folder-badge" style="background: ${folder.color}; color: white;"><i class="fa-solid ${folder.icon}"></i> ${folder.name}</span>` : ""}
                            <span class="task-difficulty">${task.difficulty || "medium"}</span>
                            ${task.dueDate ? `<span class="task-due-date ${isOverdue ? "overdue" : ""}"><i class="fa-solid fa-calendar"></i> ${dateStr}</span>` : ""}
                            ${totalSub > 0 ? `<span class="task-subtasks-indicator"><i class="fa-solid fa-list-check"></i> ${doneSub}/${totalSub}</span>` : ""}
                            ${task.repeating ? '<i class="fa-solid fa-repeat" title="Repeats"></i>' : ""}
                            ${(task.attachments || []).length > 0 ? `<i class="fa-solid fa-paperclip" title="Attachments"></i>` : ""}
                            ${(task.reminders || []).length > 0 ? `<i class="fa-solid fa-bell" title="Reminders"></i>` : ""}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn edit-task" data-id="${task.id}"><i class="fa-solid fa-pencil"></i></button>
                        <button class="task-action-btn delete delete-task" data-id="${task.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            })
            .join("");
    }

    container.querySelectorAll(".task-checkbox").forEach((cb) => {
        cb.addEventListener("change", (e) => {
            e.stopPropagation();
            onToggleComplete(e.target.closest(".task-item").dataset.taskId);
        });
    });

    container.querySelectorAll(".edit-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            onEditTask(btn.dataset.id);
        });
    });

    container.querySelectorAll(".delete-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            onDeleteTask(btn.dataset.id);
        });
    });

    if (currentView === "calendar" && onRenderCalendar) onRenderCalendar();
}

export function renderFolders(
    folders,
    tasks,
    currentFolder,
    onSelectFolder,
    onEditFolder,
    onDeleteFolder
) {
    const container = document.getElementById("foldersList");
    if (!container) return;

    container.innerHTML = folders.map(folder => `
        <div class="folder-item ${currentFolder === folder.id ? "active" : ""}" 
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
    `).join("");

    container.querySelectorAll(".folder-item").forEach(item => {
        item.addEventListener("click", (e) => {
            if (e.target.closest(".folder-actions")) return;
            onSelectFolder(item.dataset.folderId);
        });
    });

    container.querySelectorAll(".edit-folder").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            onEditFolder(btn.dataset.id);
        });
    });

    container.querySelectorAll(".delete-folder").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            onDeleteFolder(btn.dataset.id);
        });
    });
}

export function updateFolderDropdown(folders) {
    const select = document.getElementById("editTaskFolder");
    if (!select) return;
    select.innerHTML = '<option value="">No Folder</option>';
    folders.forEach(f => {
        const option = document.createElement("option");
        option.value = f.id;
        option.textContent = f.name;
        select.appendChild(option);
    });
}

export function updateStats(tasks, folders) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    const setStat = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = val;
            el.style.animation = "none";
            el.offsetHeight;
            el.style.animation = "numberPop 0.3s ease";
        }
    };

    setStat("statTotal", total);
    setStat("statCompleted", completed);
    setStat("statPending", pending);

    folders.forEach(folder => {
        const count = tasks.filter(t => t.folderId === folder.id).length;
        const folderEl = document.querySelector(`[data-folder-id="${folder.id}"]`);
        if (folderEl) {
            const countEl = folderEl.querySelector(".folder-count");
            if (countEl) countEl.textContent = `${count} tasks`;
        }
    });
}

export function setupTaskDragAndDrop(tasks, saveData) {
    let draggedTask = null;

    function handleDragStart(e) {
        draggedTask = this;
        e.dataTransfer.effectAllowed = "move";
        this.classList.add("dragging");
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const container = document.getElementById("tasksContainer");
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

    function handleDragEnd() {
        this.classList.remove("dragging");
        draggedTask = null;
        const container = document.getElementById("tasksContainer");
        const items = [...container.querySelectorAll(".task-item")];
        items.forEach((item, index) => {
            const id = item.dataset.taskId;
            const task = tasks.find((t) => t.id === id);
            if (task) task.order = index;
        });
        saveData();
    }

    const items = document.querySelectorAll(".task-item");
    items.forEach((item) => {
        item.addEventListener("dragstart", handleDragStart);
        item.addEventListener("dragover", handleDragOver);
        item.addEventListener("drop", handleDrop);
        item.addEventListener("dragend", handleDragEnd);
    });
}

export function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".task-item:not(.dragging)")];
    return draggableElements.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;
}