import { onReady } from "../core/dom.js";

function getTodoOverlay() {
    return document.getElementById("todoOverlay");
}

export function initTodo() {
    const todoBtn = document.getElementById("todoBtn");
    const sheetTodoBtn = document.getElementById("sheetTodoBtn");
    const closeBtn = document.getElementById("closeTodoOverlay");
    const overlay = getTodoOverlay();

    function openTodoModal() {
        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            if (overlay) {
                const overlayId = overlay.id;
                window.overlayManager.open(overlayId);
            }
        }
        if (overlay) {
            overlay.classList.add("active");
        }
    }

    function closeTodoModal() {
        if (window.overlayManager && overlay) {
            window.overlayManager.close(overlay.id);
        } else if (window.overlayManager) {
            window.overlayManager.close("todoOverlay");
        }
        if (overlay) {
            overlay.classList.remove("active");
        }
    }

    if (todoBtn) {
        todoBtn.addEventListener("click", openTodoModal);
    }
    if (sheetTodoBtn) {
        sheetTodoBtn.addEventListener("click", openTodoModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener("click", closeTodoModal);
    }

    if (window.overlayManager && overlay) {
        window.overlayManager.register(overlay.id, {
            onClose: () => {
                if (overlay) {
                    overlay.classList.remove("active");
                }
            },
        });
    }
}

onReady(initTodo);

export function openTodoModal() {
    const overlay = getTodoOverlay();
    if (window.overlayManager && overlay) {
        window.overlayManager.close("sideMenu");
        window.overlayManager.open(overlay.id);
    }
    if (overlay) {
        overlay.classList.add("active");
    }
}