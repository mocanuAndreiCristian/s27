export function initReleaseNotesCollapsible() {
    const notes = document.querySelectorAll(".release-note");
    if (!notes || notes.length === 0) return;

    notes.forEach((note) => {
        const header = note.querySelector(".release-header");
        if (!header) return;

        if (!note.querySelector(".release-body")) {
            const body = document.createElement("div");
            body.className = "release-body";

            let sibling = header.nextElementSibling;
            while (sibling) {
                const next = sibling.nextElementSibling;
                body.appendChild(sibling);
                sibling = next;
            }

            note.appendChild(body);
        }

        header.setAttribute("tabindex", "0");
        header.setAttribute("role", "button");
        header.setAttribute("aria-expanded", note.classList.contains("open") ? "true" : "false");

        function closeOtherNotes() {
            document.querySelectorAll(".release-note.open").forEach((openNote) => {
                if (openNote === note) return;

                openNote.classList.remove("open");
                const openHeader = openNote.querySelector(".release-header");
                if (openHeader) openHeader.setAttribute("aria-expanded", "false");
            });
        }

        function toggleNote() {
            const isOpen = note.classList.contains("open");
            if (isOpen) {
                note.classList.remove("open");
                header.setAttribute("aria-expanded", "false");
                return;
            }

            closeOtherNotes();
            note.classList.add("open");
            header.setAttribute("aria-expanded", "true");
        }

        header.addEventListener("click", (event) => {
            if (event.target.closest(".preset-card-actions, .preset-card-btn, .close-btn, .fa-trash")) {
                return;
            }

            toggleNote();
        });

        header.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleNote();
            } else if (event.key === "Escape") {
                note.classList.remove("open");
                header.setAttribute("aria-expanded", "false");
            }
        });
    });
}

initReleaseNotesCollapsible();

