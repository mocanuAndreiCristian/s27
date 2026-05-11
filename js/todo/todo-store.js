import { TODO_STORAGE, createDefaultFolders } from "./todo-constants.js";

export function generateTodoId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function loadTodoData() {
    let tasks = [];
    let folders = [];
    let notifiedTasks = new Set();

    try {
        tasks = JSON.parse(localStorage.getItem(TODO_STORAGE.TASKS) || "[]");
        folders = JSON.parse(localStorage.getItem(TODO_STORAGE.FOLDERS) || "[]");
        notifiedTasks = new Set(JSON.parse(localStorage.getItem(TODO_STORAGE.NOTIFIED) || "[]"));
    } catch (error) {
        console.error("Error loading data:", error);
    }

    if (folders.length === 0) {
        folders = createDefaultFolders(generateTodoId);
        saveTodoData({ tasks, folders, notifiedTasks });
    }

    return { tasks, folders, notifiedTasks };
}

export function saveTodoData({ tasks = [], folders = [], notifiedTasks = new Set() }) {
    localStorage.setItem(TODO_STORAGE.TASKS, JSON.stringify(tasks));
    localStorage.setItem(TODO_STORAGE.FOLDERS, JSON.stringify(folders));
    localStorage.setItem(TODO_STORAGE.NOTIFIED, JSON.stringify([...notifiedTasks]));
}

