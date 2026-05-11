import { FOLDER_ICONS } from "./todo-constants.js";

export function renderIconPicker() {
    const grid = document.getElementById("iconPickerGrid");
    if (!grid) return;

    grid.innerHTML = FOLDER_ICONS.map((icon) => `
        <div class="icon-option" data-icon="${icon}">
            <i class="fa-solid ${icon}"></i>
        </div>
    `).join("");

    grid.querySelectorAll(".icon-option").forEach((opt) => {
        opt.addEventListener("click", () => {
            grid.querySelectorAll(".icon-option").forEach((o) => o.classList.remove("active"));
            opt.classList.add("active");
        });
    });
}

export function renderTempAttachments(tempAttachments) {
    const list = document.getElementById("attachmentsList");
    if (!list) return;
    list.innerHTML = tempAttachments
        .map((att, i) => `
        <div class="attachment-item">
            <i class="fa-solid fa-file attachment-icon"></i>
            <span class="attachment-name">${att.name}</span>
            <button class="attachment-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `)
        .join("");

    list.querySelectorAll(".attachment-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
            tempAttachments.splice(btn.dataset.index, 1);
            renderTempAttachments(tempAttachments);
        });
    });
}

export function renderTempReminders(tempReminders) {
    const list = document.getElementById("remindersList");
    if (!list) return;
    list.innerHTML = tempReminders
        .map((rem, i) => {
            const dateStr = new Date(rem).toLocaleString();
            return `
        <div class="reminder-item">
            <span class="reminder-time"><i class="fa-solid fa-clock"></i> ${dateStr}</span>
            <button class="reminder-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
        </div>`;
        })
        .join("");

    list.querySelectorAll(".reminder-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
            tempReminders.splice(btn.dataset.index, 1);
            renderTempReminders(tempReminders);
        });
    });
}

export function renderTempSubtasks(tempSubtasks) {
    const list = document.getElementById("subtasksList");
    if (!list) return;
    list.innerHTML = tempSubtasks
        .map((st, i) => `
        <div class="subtask-item ${st.completed ? "completed" : ""}">
            <input type="checkbox" ${st.completed ? "checked" : ""} data-index="${i}">
            <span class="subtask-text">${st.title}</span>
            <button class="subtask-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `)
        .join("");

    list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener("change", (e) => {
            tempSubtasks[e.target.dataset.index].completed = e.target.checked;
            renderTempSubtasks(tempSubtasks);
        });
    });

    list.querySelectorAll(".subtask-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
            tempSubtasks.splice(btn.dataset.index, 1);
            renderTempSubtasks(tempSubtasks);
        });
    });
}

export function openAddTaskHandler(state) {
    state.editingTaskId = null;
    document.getElementById("taskEditTitle").innerHTML = '<i class="fa-solid fa-plus"></i> New Task';

    document.getElementById("editTaskTitle").value = "";
    document.getElementById("editTaskFolder").value = state.currentFolder || "";
    document.getElementById("editTaskDescription").value = "";
    document.getElementById("editTaskDifficulty").value = "medium";
    document.getElementById("editTaskDueDate").value = "";
    document.getElementById("editTaskRepeating").checked = false;
    document.getElementById("repeatingOptions").style.display = "none";
    document.getElementById("editTaskRepeatInterval").value = "daily";

    state.currentPriority = "medium";
    document.querySelectorAll(".priority-flag").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.priority === "medium");
    });

    state.tempAttachments.length = 0;
    state.tempReminders.length = 0;
    state.tempSubtasks.length = 0;
    renderTempAttachments(state.tempAttachments);
    renderTempReminders(state.tempReminders);
    renderTempSubtasks(state.tempSubtasks);

    state.updateFolderDropdown();
    document.getElementById("taskEditModal").classList.add("active");
}

export function openEditTaskHandler(state, taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    state.editingTaskId = taskId;
    document.getElementById("taskEditTitle").innerHTML = '<i class="fa-solid fa-pencil"></i> Edit Task';

    document.getElementById("editTaskTitle").value = task.title;
    state.updateFolderDropdown();
    document.getElementById("editTaskFolder").value = task.folderId || "";
    document.getElementById("editTaskDescription").value = task.description || "";
    document.getElementById("editTaskDifficulty").value = task.difficulty || "medium";
    document.getElementById("editTaskDueDate").value = task.dueDate || "";
    document.getElementById("editTaskRepeating").checked = task.repeating || false;
    document.getElementById("repeatingOptions").style.display = task.repeating ? "block" : "none";
    document.getElementById("editTaskRepeatInterval").value = task.repeatInterval || "daily";

    state.currentPriority = task.priority;
    document.querySelectorAll(".priority-flag").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.priority === task.priority);
    });

    state.tempAttachments.push(...(task.attachments || []));
    state.tempReminders.push(...(task.reminders || []));
    state.tempSubtasks.push(...(task.subtasks || []));
    renderTempAttachments(state.tempAttachments);
    renderTempReminders(state.tempReminders);
    renderTempSubtasks(state.tempSubtasks);

    document.getElementById("taskEditModal").classList.add("active");
}

export function saveTaskHandler(state) {
    const title = document.getElementById("editTaskTitle").value.trim();
    if (!title) return alert("Task title is required");

    const folderId = document.getElementById("editTaskFolder").value;
    const desc = document.getElementById("editTaskDescription").value.trim();
    const diff = document.getElementById("editTaskDifficulty").value;
    const due = document.getElementById("editTaskDueDate").value;
    const repeating = document.getElementById("editTaskRepeating").checked;
    const interval = document.getElementById("editTaskRepeatInterval").value;

    if (state.editingTaskId) {
        const task = state.tasks.find((t) => t.id === state.editingTaskId);
        if (task) {
            task.title = title;
            task.folderId = folderId;
            task.description = desc;
            task.priority = state.currentPriority;
            task.difficulty = diff;
            task.dueDate = due;
            task.repeating = repeating;
            task.repeatInterval = interval;
            task.attachments = state.tempAttachments;
            task.reminders = state.tempReminders;
            task.subtasks = state.tempSubtasks;
        }
    } else {
        const newTask = {
            id: state.generateId(),
            title,
            folderId,
            description: desc,
            priority: state.currentPriority,
            difficulty: diff,
            dueDate: due,
            repeating,
            repeatInterval: interval,
            attachments: state.tempAttachments,
            reminders: state.tempReminders,
            subtasks: state.tempSubtasks,
            completed: false,
            createdAt: new Date().toISOString(),
            order: 0,
        };
        state.tasks.forEach((t) => t.order++);
        state.tasks.unshift(newTask);
    }

    state.saveData();
    state.renderTasks();
    state.updateStats();
    document.getElementById("taskEditModal").classList.remove("active");
}

export function setupTaskModalListeners(state) {
    document.getElementById("saveTaskEdit")?.addEventListener("click", () => saveTaskHandler(state));
    document.getElementById("cancelTaskEdit")?.addEventListener("click", () => {
        document.getElementById("taskEditModal").classList.remove("active");
    });
    document.getElementById("closeTaskEdit")?.addEventListener("click", () => {
        document.getElementById("taskEditModal").classList.remove("active");
    });

    document.querySelectorAll(".priority-flag").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".priority-flag").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentPriority = btn.dataset.priority;
        });
    });

    document.getElementById("editTaskRepeating")?.addEventListener("change", (e) => {
        document.getElementById("repeatingOptions").style.display = e.target.checked ? "block" : "none";
    });

    document.getElementById("addAttachmentBtn")?.addEventListener("click", () => {
        const name = prompt("Attachment Name (Simulation):");
        if (name) {
            state.tempAttachments.push({ name: name, url: "#" });
            renderTempAttachments(state.tempAttachments);
        }
    });

    document.getElementById("addReminderBtn")?.addEventListener("click", () => {
        const time = prompt("Enter reminder time (YYYY-MM-DD HH:MM):", new Date().toISOString().slice(0, 16).replace("T", " "));
        if (time) {
            const d = new Date(time);
            if (!isNaN(d.getTime())) {
                state.tempReminders.push(d.toISOString());
                renderTempReminders(state.tempReminders);
            } else {
                alert("Invalid Date");
            }
        }
    });

    document.getElementById("addSubtaskBtn")?.addEventListener("click", () => {
        const input = document.getElementById("subtaskInput");
        const val = input.value.trim();
        if (val) {
            state.tempSubtasks.push({ title: val, completed: false });
            renderTempSubtasks(state.tempSubtasks);
            input.value = "";
        }
    });

    document.getElementById("addTaskBtn")?.addEventListener("click", () => openAddTaskHandler(state));
}

export function openAddFolderHandler(state) {
    state.editingFolderId = null;
    const modal = document.getElementById("folderEditModal");
    document.getElementById("folderEditTitle").innerHTML = '<i class="fa-solid fa-folder-plus"></i> New Folder';
    document.getElementById("editFolderName").value = "";
    document.getElementById("editFolderDescription").value = "";

    document.querySelectorAll(".color-option").forEach((o) => o.classList.remove("active"));
    document.querySelector(".color-option[data-color=\"#6196ff\"]").classList.add("active");

    document.querySelectorAll(".icon-option").forEach((o) => o.classList.remove("active"));
    document.querySelector(".icon-option[data-icon=\"fa-folder\"]").classList.add("active");

    if (modal) modal.classList.add("active");
}

export function openEditFolderHandler(state, id) {
    const folder = state.folders.find((f) => f.id === id);
    if (!folder) return;

    state.editingFolderId = id;
    const modal = document.getElementById("folderEditModal");
    document.getElementById("folderEditTitle").innerHTML = '<i class="fa-solid fa-folder-pen"></i> Edit Folder';
    document.getElementById("editFolderName").value = folder.name;
    document.getElementById("editFolderDescription").value = folder.description || "";

    document.querySelectorAll(".color-option").forEach((o) => {
        o.classList.toggle("active", o.dataset.color === folder.color);
    });

    document.querySelectorAll(".icon-option").forEach((o) => {
        o.classList.toggle("active", o.dataset.icon === folder.icon);
    });

    if (modal) modal.classList.add("active");
}

export function saveFolderHandler(state) {
    const name = document.getElementById("editFolderName").value.trim();
    const desc = document.getElementById("editFolderDescription").value.trim();
    const colorBtn = document.querySelector(".color-option.active");
    const iconBtn = document.querySelector(".icon-option.active");

    if (!name) return alert("Folder name is required.");

    const color = colorBtn ? colorBtn.dataset.color : "#6196ff";
    const icon = iconBtn ? iconBtn.dataset.icon : "fa-folder";

    if (state.editingFolderId) {
        const folder = state.folders.find((f) => f.id === state.editingFolderId);
        if (folder) {
            folder.name = name;
            folder.description = desc;
            folder.color = color;
            folder.icon = icon;
        }
    } else {
        state.folders.push({ id: state.generateId(), name, description: desc, color, icon, order: state.folders.length });
    }

    state.saveData();
    state.renderFolders();
    state.renderTasks();
    state.updateFolderDropdown();
    document.getElementById("folderEditModal").classList.remove("active");
}

export function setupFolderModalListeners(state) {
    document.getElementById("addFolderBtn")?.addEventListener("click", () => openAddFolderHandler(state));

    document.getElementById("saveFolderEdit")?.addEventListener("click", () => saveFolderHandler(state));
    document.getElementById("cancelFolderEdit")?.addEventListener("click", () => {
        document.getElementById("folderEditModal").classList.remove("active");
    });
    document.getElementById("closeFolderEdit")?.addEventListener("click", () => {
        document.getElementById("folderEditModal").classList.remove("active");
    });

    document.querySelectorAll(".color-option").forEach((opt) => {
        opt.addEventListener("click", () => {
            document.querySelectorAll(".color-option").forEach((o) => o.classList.remove("active"));
            opt.classList.add("active");
        });
    });
}