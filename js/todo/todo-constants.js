export const TODO_STORAGE = {
    TASKS: "adv-todo-tasks",
    FOLDERS: "adv-todo-folders",
    NOTIFIED: "adv-todo-notified",
    SETTINGS: "adv-todo-settings",
};

export const FOLDER_ICONS = [
    "fa-folder", "fa-briefcase", "fa-home", "fa-heart", "fa-star",
    "fa-graduation-cap", "fa-book", "fa-shopping-cart", "fa-utensils", "fa-dumbbell",
    "fa-plane", "fa-palette", "fa-music", "fa-gamepad", "fa-film",
    "fa-camera", "fa-car", "fa-coffee", "fa-gift", "fa-lightbulb",
    "fa-rocket", "fa-umbrella", "fa-key", "fa-bell", "fa-flag",
    "fa-chart-line", "fa-code", "fa-laptop", "fa-mobile", "fa-headphones",
    "fa-bicycle", "fa-tree", "fa-paw", "fa-hammer", "fa-wrench",
    "fa-flask", "fa-trophy", "fa-medal", "fa-fire", "fa-snowflake",
];

export const PRIORITY_COLORS = {
    "very-high": "#dc2626",
    high: "#ea580c",
    medium: "#f59e0b",
    low: "#10b981",
    "very-low": "#3b82f6",
};

export const PRIORITY_ORDER = {
    "very-high": 0,
    high: 1,
    medium: 2,
    low: 3,
    "very-low": 4,
};

export function createDefaultFolders(generateId) {
    return [
        { id: generateId(), name: "Personal", description: "Personal tasks", color: "#6196ff", icon: "fa-home", order: 0 },
        { id: generateId(), name: "Work", description: "School/Work tasks", color: "#ef4444", icon: "fa-briefcase", order: 1 },
        { id: generateId(), name: "Shopping", description: "Groceries etc.", color: "#10b981", icon: "fa-shopping-cart", order: 2 },
    ];
}

