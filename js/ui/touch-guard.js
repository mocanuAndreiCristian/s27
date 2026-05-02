let lastTouchEnd = 0;

export function installDoubleTapZoomGuard() {
    document.addEventListener(
        "touchend",
        (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        },
        { passive: false },
    );
}

installDoubleTapZoomGuard();

