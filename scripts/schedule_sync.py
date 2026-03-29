
#Schedule Sync - Fetch and parse school class schedules from HTML and save as JSON.

#This script fetches HTML schedule pages from a school website, extracts schedule data
#from HTML tables, normalizes subject names, and saves the parsed schedule as JSON files.


# python scripts/schedule_sync.py --class-id 8d (or any other class id) to fetch and update the schedule for that class

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

# Days of the week in order (Monday-Friday)
DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"]

# Common placeholder tokens that indicate empty/no subject
PLACEHOLDER_TOKENS = {"", "-", "--", "---", "—", "–", "n/a", "na"}

# Mapping of subject names (normalized) to display metadata (name, emoji, flag icon)
# Used to standardize and enrich subject information
SUBJECT_MAP: Dict[str, Dict[str, str]] = {
    "chimie": {"name": "Chimie", "emoji": "🧪"},
    "limba romana": {"name": "Română", "emoji": "", "flag": "fi fi-ro"},
    "limba si literatura romana": {"name": "Română", "emoji": "", "flag": "fi fi-ro"},
    "romana": {"name": "Română", "emoji": "", "flag": "fi fi-ro"},
    "dirigentie": {"name": "Dirigenție", "emoji": "📰"},
    "educatie fizica": {"name": "Sport", "emoji": "⚽"},
    "sport": {"name": "Sport", "emoji": "⚽"},
    "matematica": {"name": "Mate", "emoji": "📏"},
    "mate": {"name": "Mate", "emoji": "📏"},
    "informatica": {"name": "Informatică", "emoji": "💻"},
    "educatie muzicala": {"name": "Muzică", "emoji": "🎵"},
    "muzica": {"name": "Muzică", "emoji": "🎵"},
    "fizica": {"name": "Fizică", "emoji": "💡"},
    "istorie": {"name": "Istorie", "emoji": "📜"},
    "educatie tehnologica": {"name": "Tehnologică", "emoji": "🧰"},
    "educatie tehnologica si aplicatii practice": {"name": "Tehnologică", "emoji": "🧰"},
    "tehnologica": {"name": "Tehnologică", "emoji": "🧰"},
    "biologie": {"name": "Biologie", "emoji": "🧬"},
    "civica": {"name": "Civică", "emoji": "🏛️"},
    "educatie sociala": {"name": "Civică", "emoji": "🏛️"},
    "optional matematica": {"name": "Opt Mate", "emoji": "📐"},
    "optional limba romana": {"name": "Opt Română", "emoji": "", "flag": "fi fi-ro"},
    "optional romana": {"name": "Opt Română", "emoji": "", "flag": "fi fi-ro"},
    "limba engleza": {"name": "Engleză", "emoji": "", "flag": "fi fi-gb"},
    "engleza": {"name": "Engleză", "emoji": "", "flag": "fi fi-gb"},
    "limba franceza": {"name": "Franceză", "emoji": "", "flag": "fi fi-fr"},
    "franceza": {"name": "Franceză", "emoji": "", "flag": "fi fi-fr"},
    "geografie": {"name": "Geografie", "emoji": "🌍"},
    "religie": {"name": "Religie", "emoji": "☦️"},
    "educatie plastica": {"name": "Arte", "emoji": "🎨"},
    "arte": {"name": "Arte", "emoji": "🎨"},
}


class ScheduleTableParser(HTMLParser):
    #HTML parser that extracts schedule table data from school website HTML.
    
    #Parses HTML tables looking for the schedule table (identified by specific id or class)
    #and extracts the table rows into a 2D list of strings.
    
    def __init__(self) -> None:
        super().__init__()
        self.in_table = False  # Whether we're currently inside the target table
        self.table_depth = 0  # Depth counter for nested tables
        self.in_tbody = False  # Whether we're inside a tbody element
        self.in_row = False  # Whether we're currently parsing a table row (tr)
        self.in_cell = False  # Whether we're currently inside a cell (td/th)
        self.current_cell: List[str] = []  # Text content of current cell
        self.current_row: List[str] = []  # Cells in current row
        self.rows: List[List[str]] = []  # All parsed rows from the table
        self.target_table_found = False  # Flag to ensure we only parse one target table

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        """Handle opening HTML tags while parsing."""
        if tag == "table":
            # Check if this is the target schedule table (not nested)
            if not self.in_table and not self.target_table_found and self._is_target_table(attrs):
                self.in_table = True
                self.table_depth = 1
                self.target_table_found = True
            elif self.in_table:
                # Track nested tables depth
                self.table_depth += 1
            return

        if not self.in_table:
            return

        if tag == "tbody":
            self.in_tbody = True
        elif self.in_tbody and tag == "tr":
            self.in_row = True
            self.current_row = []
        elif self.in_row and tag in {"th", "td"}:
            self.in_cell = True
            self.current_cell = []

    def handle_endtag(self, tag: str) -> None:
        #Handle closing HTML tags while parsing.
        if tag == "table" and self.in_table:
            self.table_depth -= 1
            if self.table_depth <= 0:
                self.in_table = False
            return

        if not self.in_table:
            return

        if tag == "tbody":
            self.in_tbody = False
        elif self.in_row and tag in {"th", "td"}:
            # Clean up cell text: unescape HTML entities and normalize whitespace
            text = html.unescape("".join(self.current_cell))
            text = re.sub(r"\s+", " ", text).strip()
            self.current_row.append(text)
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            # Add completed row to results
            if self.current_row:
                self.rows.append(self.current_row)
            self.in_row = False

    def handle_data(self, data: str) -> None:
        #Handle text data within HTML elements.
        if self.in_cell:
            self.current_cell.append(data)

    @staticmethod
    def _is_target_table(attrs: List[tuple[str, Optional[str]]]) -> bool:
        #Check if a table element is the schedule table we're looking for.
        #Looks for tables with id starting with 'table_' or class containing 'odd_table'.

        attr_map = {k: (v or "") for k, v in attrs}
        table_id = attr_map.get("id", "")
        table_class = attr_map.get("class", "")
        if table_id.startswith("table_"):
            return True
        return "odd_table" in table_class.split()


def fetch_html(url: str) -> str:

    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        html_text = response.read().decode(charset, errors="replace")
    return html_text.lstrip("\ufeff")  # Remove BOM marker if present


def parse_schedule_table(html_text: str) -> List[List[str]]:
    parser = ScheduleTableParser()
    parser.feed(html_text)
    return parser.rows


def normalize_key(text: str) -> str:
    cleaned = html.unescape(text).strip().lower().replace("\u00a0", " ")
    # Decompose accented characters into base + combining marks
    cleaned = unicodedata.normalize("NFKD", cleaned)
    # Remove combining diacritical marks
    cleaned = "".join(ch for ch in cleaned if not unicodedata.combining(ch))
    # Remove special characters, keep only a-z, 0-9, and spaces
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", cleaned)
    # Normalize whitespace
    return re.sub(r"\s+", " ", cleaned).strip()


def is_placeholder(text: str) -> bool:
    if not text:
        return True
    raw = text.strip()
    if raw in PLACEHOLDER_TOKENS:
        return True
    return normalize_key(raw) == ""


def subject_from_text(text: str) -> Optional[Dict[str, str]]:
    if text is None or is_placeholder(text):
        return None

    raw = text.strip()
    key = normalize_key(raw)

    # Direct lookup in subject map
    if key in SUBJECT_MAP:
        return dict(SUBJECT_MAP[key])

    # Handle optional subjects (e.g., "Optional Matematica")
    if key.startswith("optional "):
        base_key = key[len("optional "):].strip()
        base_raw = re.sub(r"(?i)^op(?:ț|t)ional\s+", "", raw).strip()

        if key in SUBJECT_MAP:
            return dict(SUBJECT_MAP[key])

        # Try to find base subject and add "Opt" prefix
        base_subject = SUBJECT_MAP.get(base_key)
        if base_subject:
            result = dict(base_subject)
            result["name"] = f"Opt {base_subject['name']}"
            return result

        # Unknown optional subject - use raw text with prefix
        if base_raw:
            return {"name": f"Opt {base_raw}", "emoji": ""}

    # Unknown subject - return as-is
    return {"name": raw, "emoji": ""}


def build_schedule(rows: List[List[str]]) -> Dict[str, Any]:
    schedule_rows: List[Dict[str, Any]] = []
    for row in rows:
        if not row:
            continue
        # First cell is the time slot
        time_value = row[0].strip() if row[0] else ""
        if not time_value:
            continue

        # Remaining cells are days (Monday-Friday)
        day_cells = row[1:]
        # Pad with empty strings if fewer than 5 days
        if len(day_cells) < len(DAY_KEYS):
            day_cells = day_cells + [""] * (len(DAY_KEYS) - len(day_cells))

        entry: Dict[str, Any] = {"time": time_value}
        # Convert each day's subject text to standardized format
        for idx, day in enumerate(DAY_KEYS):
            entry[day] = subject_from_text(day_cells[idx])

        schedule_rows.append(entry)

    return {"schedule": schedule_rows}


def canonical_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def has_changed(old_data: Dict[str, Any], new_data: Dict[str, Any]) -> bool:
    return canonical_json(old_data) != canonical_json(new_data)

def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=4)
        handle.write("\n")  # Ensure file ends with newline


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch class schedule and output JSON format.")
    parser.add_argument("--url", help="Schedule URL (default: https://s27.ro/<class-id>)")
    parser.add_argument("--class-id", default="8d", help="Class id for default URL/output")
    parser.add_argument("--out", help="Output path (default: data/<class-id>.json)")
    parser.add_argument("--check", action="store_true", help="Only check if schedule changed")

    args = parser.parse_args()

    # Build URL and output path
    class_id = args.class_id.strip()
    url = args.url or f"https://s27.ro/{class_id}"
    out_path = Path(args.out) if args.out else Path("data") / f"{class_id}.json"

    # Fetch and parse the schedule
    html_text = fetch_html(url)
    rows = parse_schedule_table(html_text)
    if not rows:
        raise SystemExit("No schedule table rows found. Check the URL or page structure.")

    # Build structured schedule data
    new_data = build_schedule(rows)

    # Check if data has changed
    changed = True
    if out_path.exists():
        old_data = load_json(out_path)
        changed = has_changed(old_data, new_data)

    print(f"Schedule changed: {changed}")

    # In check mode, just return exit status
    if args.check:
        return 1 if changed else 0

    # Skip saving if no changes
    if not changed:
        return 0

    # Prompt user to confirm update
    try:
        choice = input("Update schedule file? [y/N]: ").strip().lower()
    except EOFError:
        choice = ""

    # Save if confirmed
    if choice in {"y", "yes"}:
        save_json(out_path, new_data)
        return 0

    print("Skipped updating schedule file.")
    return 0


# Run the script
if __name__ == "__main__":
    sys.exit(main())