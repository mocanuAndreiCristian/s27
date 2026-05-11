import { PRIORITY_ORDER } from "./todo-constants.js";

export function filterTodoTasks({
    tasks = [],
    currentFolder = null,
    currentFilter = "all",
    activeFilters = {},
    searchTerm = "",
} = {}) {
    let filtered = [...tasks];

    if (currentFolder) {
        filtered = filtered.filter((task) => task.folderId === currentFolder);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(todayStart.getDate() + 7);

    switch (currentFilter) {
        case "today":
            filtered = filtered.filter((task) => {
                if (!task.dueDate) return false;
                const date = new Date(task.dueDate);
                return date >= todayStart && date < tomorrowStart;
            });
            break;
        case "week":
            filtered = filtered.filter((task) => {
                if (!task.dueDate) return false;
                const date = new Date(task.dueDate);
                return date >= todayStart && date <= weekEnd;
            });
            break;
        case "overdue":
            filtered = filtered.filter((task) => task.dueDate && new Date(task.dueDate) < now && !task.completed);
            break;
        case "completed":
            filtered = filtered.filter((task) => task.completed);
            break;
        default:
            break;
    }

    filtered = filtered.filter((task) => {
        const priorityMatch = (activeFilters.priority || []).includes(task.priority);
        const statusMatch = (activeFilters.status || []).includes(task.completed ? "completed" : "pending");
        return priorityMatch && statusMatch;
    });

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((task) => task.title.toLowerCase().includes(term));
    }

    return filtered;
}

export function sortTodoTasks(taskList = [], currentSort = "manual") {
    if (currentSort === "manual") {
        return taskList.sort((left, right) => (left.order || 0) - (right.order || 0));
    }

    return taskList.sort((left, right) => {
        if (currentSort === "priority") {
            return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
        }

        if (currentSort === "dueDate") {
            if (!left.dueDate) return 1;
            if (!right.dueDate) return -1;
            return new Date(left.dueDate) - new Date(right.dueDate);
        }

        if (currentSort === "created") return new Date(right.createdAt) - new Date(left.createdAt);
        if (currentSort === "name") return left.title.localeCompare(right.title);
        return 0;
    });
}

