import { onReady } from "../core/dom.js";
import { overlayManager } from "../overlays/overlay-manager.js";

function getTodoOverlay() {
    return document.getElementById("todoOverlay");
}

export function initTodo() {
    const todoBtn = document.getElementById("todoBtn");
    const sheetTodoBtn = document.getElementById("sheetTodoBtn");
    const closeBtn = document.getElementById("closeTodoOverlay");
    const overlay = getTodoOverlay();

    function openTodoModal() {
        overlayManager.close("sideMenu");
        if (overlay) {
            const overlayId = overlay.id;
            overlayManager.open(overlayId);
        }
        if (overlay) {
            overlay.classList.add("active");
        }
    }

    function closeTodoModal() {
        if (overlay) {
            overlayManager.close(overlay.id);
        } else {
            overlayManager.close("todoOverlay");
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

    if (overlay) {
        overlayManager.register(overlay.id, {
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
    if (overlay) {
        overlayManager.close("sideMenu");
        overlayManager.open(overlay.id);
    }
    if (overlay) {
        overlay.classList.add("active");
    }
}
