export function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function sendNotification(title, body, tag) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body,
            icon: "https://cdn-icons-png.flaticon.com/512/762/762674.png",
            tag,
        });
    }
}

export function checkTodoNotifications({ tasks = [], notifiedTasks = new Set(), saveData }) {
    const now = new Date();

    tasks.forEach((task) => {
        if (task.completed) return;

        if (task.reminders) {
            task.reminders.forEach((reminder, index) => {
                const reminderTime = new Date(reminder);
                const diff = reminderTime - now;
                const reminderKey = `${task.id}-reminder-${index}-${reminderTime.getTime()}`;

                if (diff <= 0 && diff > -60000 && !notifiedTasks.has(reminderKey)) {
                    sendNotification("\u{1F514} Reminder", `Time for: "${task.title}"`, reminderKey);
                    notifiedTasks.add(reminderKey);
                    saveData?.();
                }
            });
        }
    });
}

export function startTodoNotificationCheck({ getTasks, getNotifiedTasks, saveData }) {
    return setInterval(() => {
        checkTodoNotifications({
            tasks: getTasks(),
            notifiedTasks: getNotifiedTasks(),
            saveData,
        });
    }, 10000);
}

export function stopTodoNotificationCheck(intervalId) {
    if (intervalId) {
        clearInterval(intervalId);
    }
}
