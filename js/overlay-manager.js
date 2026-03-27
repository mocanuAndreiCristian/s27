/* ========================================
   OVERLAY MANAGER
   Centralized handling for all overlays
   ======================================== */

class OverlayManager {
    constructor() {
        this.overlays = new Map();
        this.activeStack = [];
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.overlayBackdrop = document.getElementById("overlay");
        this.body = document.body;

        // Global Backdrop Click
        if (this.overlayBackdrop) {
            this.overlayBackdrop.addEventListener("click", () => {
                this.closeTop();
            });
        }

        // Global Escape Key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeTop();
            }
        });
    }

    /**
     * Register an overlay
     * @param {string} id - The ID of the overlay element
     * @param {object} options - Options: { 
     *      onOpen: () => void, 
     *      onClose: () => void, 
     *      closeOnBackdrop: boolean (default true)
     * }
     */
    register(id, options = {}) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`OverlayManager: Element with ID '${id}' not found.`);
            return;
        }

        this.overlays.set(id, {
            element,
            options: {
                closeOnBackdrop: true, // Default to true
                ...options
            }
        });
    }

    /**
     * Open an overlay
     * @param {string} id 
     */
    open(id) {
        const overlay = this.overlays.get(id);
        if (!overlay) {
            console.warn(`OverlayManager: Overlay '${id}' not registered.`);
            return;
        }

        // Check if already open and top of stack
        if (this.activeStack.length > 0 && this.activeStack[this.activeStack.length - 1] === id) {
            return; 
        }

        // Remove from stack if exists elsewhere (bring to top)
        const index = this.activeStack.indexOf(id);
        if (index > -1) {
            this.activeStack.splice(index, 1);
        }

        this.activeStack.push(id);
        
        // Add specific class for open state (usually 'active' or 'open')
        // Special case for sideMenu which uses 'open', others use 'active'
        const activeClass = id === "sideMenu" ? "open" : "active";
        overlay.element.classList.add(activeClass);

        // Call onOpen callback if exists
        if (overlay.options.onOpen) {
            overlay.options.onOpen();
        }

        this.updateGlobalState();
    }

    /**
     * Close an overlay
     * @param {string} id - Optional. If omitted, closes the top overlay.
     */
    close(id) {
        if (!id) {
            this.closeTop();
            return;
        }

        const overlay = this.overlays.get(id);
        if (!overlay) return;

        // Remove class
        const activeClass = id === "sideMenu" ? "open" : "active";
        overlay.element.classList.remove(activeClass);

        // Remove from stack
        const index = this.activeStack.indexOf(id);
        if (index > -1) {
            this.activeStack.splice(index, 1);
        }

        // Call onClose callback
        if (overlay.options.onClose) {
            overlay.options.onClose();
        }

        this.updateGlobalState();
    }

    /**
     * Close the top-most overlay
     */
    closeTop() {
        if (this.activeStack.length === 0) return;

        const topId = this.activeStack[this.activeStack.length - 1];
        const overlay = this.overlays.get(topId);

        // Check if allow close on backdrop (triggered by backdrop click)
        // If triggered manually, this check might be bypassed, but safe default
        if (overlay && overlay.options.closeOnBackdrop === false) {
             // For now, only backdrop click calls this directly. 
             // If escape key calls this, we might want to allow forcing close.
             // But usually non-closable overlays are special (like strict modals).
             // Assuming Escape key should also respect this.
             // If we need force close, we can use close(id).
        }
        
        this.close(topId);
    }

    /**
     * Close all registered overlays
     */
    closeAll() {
        while (this.activeStack.length > 0) {
            this.closeTop();
        }
    }

    /**
     * Update the global backdrop and body scroll state
     */
    updateGlobalState() {
        if (this.activeStack.length > 0) {
            if (this.overlayBackdrop) {
                this.overlayBackdrop.classList.add("active");
            }
            // Add no-scroll class
            this.body.classList.add("no-scroll");
            
            // Handle special classes for some overlays if needed
            // (e.g., customizations added 'no-scroll-custom')
            // To simplify, we will just use generic 'no-scroll' in generic CSS, 
            // but if specific listeners used specific classes, we might need to unify them in CSS.
            // For now, unify to 'no-scroll'.
        } else {
            if (this.overlayBackdrop) {
                this.overlayBackdrop.classList.remove("active");
            }
            this.body.classList.remove("no-scroll");
            
            // Clean up potentially leftover specific classes if any old logic missed them
            this.body.classList.remove("no-scroll-custom", "no-scroll-todo", "no-scroll-info");
        }
    }
}

// Initialize global instance
window.overlayManager = new OverlayManager();