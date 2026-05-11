export function emitAppEvent(name, detail = {}) {
    if (!name) return false;
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return true;
}

export function onAppEvent(name, handler, options) {
    if (!name || typeof handler !== "function") return () => {};
    window.addEventListener(name, handler, options);
    return () => window.removeEventListener(name, handler, options);
}

export function createEventBus() {
    const listeners = new Map();

    return {
        on(name, handler) {
            if (!name || typeof handler !== "function") return () => {};
            const set = listeners.get(name) || new Set();
            set.add(handler);
            listeners.set(name, set);
            return () => set.delete(handler);
        },
        emit(name, detail = {}) {
            const set = listeners.get(name);
            if (!set) return;
            set.forEach((handler) => handler(detail));
            emitAppEvent(name, detail);
        },
        bridge(name, detail = {}) {
            this.emit(name, detail);
        },
    };
}

