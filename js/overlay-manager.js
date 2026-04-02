(function (global) {
    "use strict";

    if (global.overlayManager) return;

    const AppUtils = global.AppUtils || {
        createId(prefix) {
            return `${prefix || "id"}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        },
        dispatchWindowEvent(name, detail) {
            if (!name || typeof global.dispatchEvent !== "function") return;
            global.dispatchEvent(new CustomEvent(name, { detail }));
        },
        onReady(callback) {
            if (typeof callback !== "function") return;
            if (!global.document || global.document.readyState !== "loading") {
                callback();
                return;
            }
            global.document.addEventListener("DOMContentLoaded", callback, { once: true });
        },
    };

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object || {}, key);
    }

    function resolveElement(target) {
        if (!target || !global.document) return null;
        if (target instanceof global.Element) return target;
        if (typeof target === "string") return global.document.getElementById(target);
        return null;
    }

    function getOverlayId(target, element) {
        if (typeof target === "string" && target.trim()) return target.trim();
        if (element && element.id) return element.id;
        if (element) {
            element.id = AppUtils.createId("overlay");
            return element.id;
        }
        return "";
    }

    function normalizeOverlayOptions(id, options, existingOptions) {
        const incoming = options || {};
        const previous = existingOptions || {};

        return {
            activeClass: String(
                incoming.activeClass ||
                previous.activeClass ||
                (id === "sideMenu" ? "open" : "active"),
            ).trim() || "active",
            closeOnBackdrop: hasOwn(incoming, "closeOnBackdrop")
                ? Boolean(incoming.closeOnBackdrop)
                : hasOwn(previous, "closeOnBackdrop")
                    ? Boolean(previous.closeOnBackdrop)
                    : true,
            closeOnEscape: hasOwn(incoming, "closeOnEscape")
                ? Boolean(incoming.closeOnEscape)
                : hasOwn(previous, "closeOnEscape")
                    ? Boolean(previous.closeOnEscape)
                    : true,
            lockScroll: hasOwn(incoming, "lockScroll")
                ? Boolean(incoming.lockScroll)
                : hasOwn(previous, "lockScroll")
                    ? Boolean(previous.lockScroll)
                    : true,
            onOpen: typeof incoming.onOpen === "function"
                ? incoming.onOpen
                : typeof previous.onOpen === "function"
                    ? previous.onOpen
                    : null,
            onClose: typeof incoming.onClose === "function"
                ? incoming.onClose
                : typeof previous.onClose === "function"
                    ? previous.onClose
                    : null,
        };
    }

    class OverlayManager {
        constructor(options) {
            const config = options || {};
            this.eventBus = config.eventBus || global.eventBus || null;
            this.overlays = new Map();
            this.activeStack = [];
            this.overlayBackdrop = null;
            this.body = global.document ? global.document.body : null;
            this.isReady = false;

            this.boundHandleBackdropClick = this.handleBackdropClick.bind(this);
            this.boundHandleKeydown = this.handleKeydown.bind(this);

            AppUtils.onReady(() => this.init());
        }

        init() {
            if (this.isReady || !global.document) return;

            this.overlayBackdrop = global.document.getElementById("overlay");
            this.body = global.document.body || this.body;

            if (this.overlayBackdrop) {
                this.overlayBackdrop.addEventListener("click", this.boundHandleBackdropClick);
            }

            global.document.addEventListener("keydown", this.boundHandleKeydown);

            this.isReady = true;
            this.refreshGlobalState();
        }

        emit(eventName, detail) {
            if (this.eventBus && typeof this.eventBus.bridge === "function") {
                this.eventBus.bridge(eventName, detail, { source: "overlayManager" });
                return;
            }

            AppUtils.dispatchWindowEvent(eventName, detail);
        }

        getStack() {
            return this.activeStack.slice();
        }

        getTop() {
            const topId = this.activeStack[this.activeStack.length - 1];
            return topId ? this.overlays.get(topId) || null : null;
        }

        getTopId() {
            return this.activeStack[this.activeStack.length - 1] || "";
        }

        isOpen(id) {
            return this.activeStack.includes(String(id || ""));
        }

        resolveRecord(id) {
            const overlayId = String(id || "").trim();
            if (!overlayId) return null;

            let record = this.overlays.get(overlayId) || null;

            if (!record && global.document) {
                const element = global.document.getElementById(overlayId);
                if (element) {
                    record = this.register(overlayId) || null;
                }
            }

            if (record && !record.element && global.document) {
                record.element = global.document.getElementById(overlayId);
            }

            return record;
        }

        register(target, options) {
            const element = resolveElement(target);
            const id = getOverlayId(target, element);

            if (!id) {
                console.warn("overlayManager.register could not resolve an overlay id");
                return null;
            }

            const existing = this.overlays.get(id) || null;
            const record = {
                id,
                element: element || (existing && existing.element) || resolveElement(id),
                options: normalizeOverlayOptions(id, options, existing && existing.options),
            };

            this.overlays.set(id, record);

            return record;
        }

        unregister(id) {
            const overlayId = String(id || "").trim();
            if (!overlayId) return false;

            if (this.isOpen(overlayId)) {
                this.close(overlayId, { reason: "unregister" });
            }

            return this.overlays.delete(overlayId);
        }

        open(id, options) {
            const record = this.resolveRecord(id);
            if (!record || !record.element) {
                console.warn(`overlayManager.open could not find "${id}"`);
                return false;
            }

            if (this.isOpen(record.id)) {
                const index = this.activeStack.indexOf(record.id);
                if (index > -1 && index !== this.activeStack.length - 1) {
                    this.activeStack.splice(index, 1);
                    this.activeStack.push(record.id);
                    this.refreshGlobalState();
                }
                return true;
            }

            const context = {
                id: record.id,
                element: record.element,
                reason: String((options && options.reason) || "manual"),
                stack: this.getStack(),
            };

            record.element.classList.add(record.options.activeClass);
            record.element.setAttribute("data-overlay-open", "true");
            this.activeStack.push(record.id);

            if (typeof record.options.onOpen === "function") {
                try {
                    record.options.onOpen(context);
                } catch (error) {
                    console.error(`overlayManager onOpen failed for "${record.id}"`, error);
                }
            }

            this.refreshGlobalState();
            this.emit("overlay:opened", {
                id: record.id,
                stack: this.getStack(),
                reason: context.reason,
            });

            return true;
        }

        close(id, options) {
            if (!id) {
                return this.closeTop(options);
            }

            const record = this.resolveRecord(id);
            if (!record || !record.element) return false;
            if (!this.isOpen(record.id)) {
                record.element.classList.remove(record.options.activeClass);
                record.element.removeAttribute("data-overlay-open");
                return false;
            }

            const index = this.activeStack.indexOf(record.id);
            if (index > -1) {
                this.activeStack.splice(index, 1);
            }

            record.element.classList.remove(record.options.activeClass);
            record.element.removeAttribute("data-overlay-open");

            const context = {
                id: record.id,
                element: record.element,
                reason: String((options && options.reason) || "manual"),
                stack: this.getStack(),
            };

            if (typeof record.options.onClose === "function") {
                try {
                    record.options.onClose(context);
                } catch (error) {
                    console.error(`overlayManager onClose failed for "${record.id}"`, error);
                }
            }

            this.refreshGlobalState();
            this.emit("overlay:closed", {
                id: record.id,
                stack: this.getStack(),
                reason: context.reason,
            });

            return true;
        }

        requestClose(id, reason, options) {
            const record = this.resolveRecord(id);
            if (!record || !record.element || !this.isOpen(record.id)) return false;

            const closeReason = String(reason || "manual");
            const force = Boolean(options && options.force);

            if (!force && closeReason === "backdrop" && record.options.closeOnBackdrop === false) {
                return false;
            }

            if (!force && closeReason === "escape" && record.options.closeOnEscape === false) {
                return false;
            }

            return this.close(record.id, { reason: closeReason });
        }

        closeTop(options) {
            const topId = this.getTopId();
            if (!topId) return false;

            return this.requestClose(
                topId,
                options && options.reason,
                options,
            );
        }

        closeAll(options) {
            const config = options || {};
            let closedAny = false;

            while (this.activeStack.length) {
                const topId = this.getTopId();
                const closed = this.requestClose(topId, config.reason || "manual", {
                    force: Boolean(config.force),
                });

                if (!closed) {
                    break;
                }

                closedAny = true;
            }

            return closedAny;
        }

        handleBackdropClick() {
            this.closeTop({ reason: "backdrop" });
        }

        handleKeydown(event) {
            if (!event || event.key !== "Escape") return;

            const closed = this.closeTop({ reason: "escape" });
            if (closed) {
                event.preventDefault();
            }
        }

        refreshGlobalState() {
            const activeRecords = this.activeStack
                .map((id) => this.resolveRecord(id))
                .filter(Boolean);

            const hasAnyOpen = activeRecords.length > 0;
            const shouldLockScroll = activeRecords.some((record) => record.options.lockScroll !== false);

            if (this.overlayBackdrop) {
                this.overlayBackdrop.classList.toggle("active", hasAnyOpen);
            }

            if (this.body) {
                this.body.classList.toggle("no-scroll", hasAnyOpen && shouldLockScroll);

                if (!hasAnyOpen) {
                    this.body.classList.remove("no-scroll-info", "no-scroll-custom", "no-scroll-todo");
                }
            }

            this.emit("overlay:stack-changed", {
                stack: this.getStack(),
                hasOpenOverlay: hasAnyOpen,
                topId: this.getTopId(),
            });
        }

        destroy() {
            if (this.overlayBackdrop) {
                this.overlayBackdrop.removeEventListener("click", this.boundHandleBackdropClick);
            }

            if (global.document) {
                global.document.removeEventListener("keydown", this.boundHandleKeydown);
            }

            this.closeAll({ force: true, reason: "destroy" });
            this.overlays.clear();
        }
    }

    global.OverlayManager = OverlayManager;
    global.overlayManager = new OverlayManager({
        eventBus: global.eventBus,
    });
})(window);
