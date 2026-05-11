import { PRIORITY_COLORS } from "./todo-constants.js";

export function renderTodoCalendar({ tasks = [], currentCalendarMonth = new Date() } = {}) {
    const grid = document.getElementById("calendarGrid");
    const monthLabel = document.getElementById("calendarMonth");
    if (!grid || !monthLabel) return;

    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    monthLabel.textContent = currentCalendarMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    grid.innerHTML = "";

    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((day) => {
        const element = document.createElement("div");
        element.className = "calendar-day-header";
        element.textContent = day;
        grid.appendChild(element);
    });

    for (let i = 0; i < startDayIndex; i++) {
        const element = document.createElement("div");
        element.className = "calendar-day other-month";
        grid.appendChild(element);
    }

    const now = new Date();
    const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;

    for (let i = 1; i <= daysInMonth; i++) {
        const element = document.createElement("div");
        element.className = `calendar-day ${isCurrentMonth && i === now.getDate() ? "today" : ""}`;

        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        const dayTasks = tasks.filter((task) => task.dueDate && task.dueDate.startsWith(dateStr) && !task.completed);

        element.innerHTML = `
            <div class="calendar-day-number">${i}</div>
            <div class="calendar-tasks">
                ${dayTasks.slice(0, 4).map((task) => {
                    const priorityColor = PRIORITY_COLORS[task.priority];
                    return `<div class="calendar-task-dot" style="background: ${priorityColor}" title="${task.title}"></div>`;
                }).join("")}
                ${dayTasks.length > 4 ? `<div class="calendar-task-dot" style="background: #999" title="More..."></div>` : ""}
            </div>
        `;

        element.addEventListener("click", () => {
            // Reserved for a future day-specific list filter.
        });

        grid.appendChild(element);
    }
}

export function updateCalendarMonth(currentCalendarMonth, direction) {
    const newDate = new Date(currentCalendarMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    return newDate;
}
