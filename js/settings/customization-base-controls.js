function getColorBrightness(color) {
    if (!color || color === "transparent") return 128;

    let hex = color;
    if (color.startsWith("rgb")) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            const [r, g, b] = match.slice(0, 3).map((value) => parseInt(value, 10));
            hex = `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
        }
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
}

export function initializeBaseControls() {
    const numberInputField = document.querySelector(".number-input-field");
    const numberBtns = document.querySelectorAll(".number-btn");
    if (numberInputField && numberBtns.length === 2) {
        numberBtns[0].addEventListener("click", () => {
            const current = parseInt(numberInputField.value, 10) || 0;
            const min = parseInt(numberInputField.min, 10) || 0;
            if (current > min) {
                numberInputField.value = String(current - 1);
            }
        });

        numberBtns[1].addEventListener("click", () => {
            const current = parseInt(numberInputField.value, 10) || 0;
            const max = parseInt(numberInputField.max, 10) || 100;
            if (current < max) {
                numberInputField.value = String(current + 1);
            }
        });
    }

    const rangeSlider = document.querySelector(".range-slider-demo");
    const rangeValue = document.querySelector("#rangeValue");
    if (rangeSlider && rangeValue) {
        const updateRangeValue = () => {
            rangeValue.textContent = rangeSlider.value;
        };
        rangeSlider.addEventListener("input", updateRangeValue);
    }

    const colorPicker = document.getElementById("demoColorPicker");
    const colorValue = document.getElementById("demoColorValue");
    if (colorPicker && colorValue) {
        const updateColorValue = () => {
            colorValue.textContent = colorPicker.value.toUpperCase();
        };
        colorPicker.addEventListener("input", updateColorValue);
        colorPicker.addEventListener("change", updateColorValue);
    }
}

export function applyAutoTintedText() {
    const selectors = [
        ".setting-group",
        ".dev-time-control",
        ".dev-weather-control",
        ".dev-quick-actions",
        ".dev-info-panel",
        ".ui-control-card",
        ".font-group",
        ".ui-controls-grid",
        ".preset-action-btn",
        ".mode-toggle-container",
    ];

    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
            const bgColor = window.getComputedStyle(element).backgroundColor;
            const brightness = getColorBrightness(bgColor);
            const textColor = brightness > 150 ? "#000000" : "#ffffff";

            element.querySelectorAll("h4, h3, h2, p, label, span, button").forEach((textEl) => {
                if (textEl.textContent && textEl.tagName !== "BUTTON") {
                    textEl.style.color = textColor;
                }
            });
        });
    });
}
