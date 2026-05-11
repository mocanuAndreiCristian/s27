export const $ = (selector, root = document) => root.querySelector(selector);

export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function byId(id) {
    return document.getElementById(id);
}

export function onReady(callback) {
    if (typeof callback !== "function") return;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
        return;
    }

    callback();
}

export function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    const { className, text, attrs } = options;

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    if (attrs && typeof attrs === "object") {
        Object.entries(attrs).forEach(([name, value]) => {
            if (value !== undefined && value !== null) {
                element.setAttribute(name, String(value));
            }
        });
    }

    return element;
}

