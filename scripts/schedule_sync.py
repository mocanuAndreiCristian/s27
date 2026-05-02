#Schedule Sync - Fetch and parse school class schedules from HTML and save as JSON.

#This script fetches HTML schedule pages from a school website, extracts schedule data
#from HTML tables, normalizes subject names, and saves the parsed schedule as JSON files.


# Usage:
#   python scripts/schedule_sync.py --class-id 8d                    # Fetch and update schedule JSON
#   python scripts/schedule_sync.py --class-id 8a --build-html       # Build HTML file from template
#   python scripts/schedule_sync.py --class-id 8a --build-html --template 8d/index.html  # Custom template

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
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
    """HTML parser that extracts schedule table data from school website HTML.
    
    Parses HTML tables looking for the schedule table (identified by specific id or class)
    and extracts the table rows into a 2D list of strings. Handles rowspan attributes
    by tracking them and filling in spanned values in subsequent rows. Also handles
    vertically stacked classes marked by <!-- span --> HTML comments.
    """
    
    def __init__(self) -> None:
        super().__init__()
        self.in_table = False  # Whether we're currently inside the target table
        self.table_depth = 0  # Depth counter for nested tables
        self.in_tbody = False  # Whether we're inside a tbody element
        self.in_row = False  # Whether we're currently parsing a table row (tr)
        self.in_cell = False  # Whether we're currently inside a cell (td/th)
        self.current_cell: List[str] = []  # Text content of current cell
        self.current_row: List[Tuple[str, int]] = []  # Cells in current row as (content, rowspan)
        self.rows: List[List[Tuple[str, int]]] = []  # All parsed rows, with rowspan info
        self.target_table_found = False  # Flag to ensure we only parse one target table
        
        # Rowspan tracking: list of (remaining_rows, column_index, value)
        self.active_rowspans: List[Tuple[int, int, str]] = []
        self.current_rowspan = 1  # Rowspan value for current cell being parsed
        self.current_col = 0  # Current column index in the row
        self.pending_span_marker = False  # Flag set by <!-- span --> comments

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
            self.current_col = 0
            self.pending_span_marker = False  # Reset span marker at start of new row
        elif self.in_row and tag in {"th", "td"}:
            self.in_cell = True
            self.current_cell = []
            self.current_rowspan = 1
            # Parse rowspan attribute
            for attr_name, attr_value in attrs:
                if attr_name == "rowspan" and attr_value:
                    try:
                        self.current_rowspan = int(attr_value)
                    except ValueError:
                        self.current_rowspan = 1

    def handle_endtag(self, tag: str) -> None:
        """Handle closing HTML tags while parsing."""
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
            
            # Skip columns that are occupied by active rowspans
            while self.current_col < 6:
                occupied = False
                for i, (remaining, col, value) in enumerate(self.active_rowspans):
                    if remaining > 0 and col == self.current_col:
                        # This column is occupied by a rowspan, skip it
                        self.current_row.append(("", 1))  # Add placeholder for spanned column
                        self.active_rowspans[i] = (remaining - 1, col, value)
                        self.current_col += 1
                        occupied = True
                        break
                if not occupied:
                    break
            
            # Check if this cell is truly a span placeholder (marked AND empty)
            is_span_marked = self.pending_span_marker and text == ""
            self.pending_span_marker = False  # Reset the marker for next cell
            
            if is_span_marked:
                # This cell is an empty span placeholder - do nothing, just skip it
                self.in_cell = False
                return
            
            # Regular cell with content
            self.current_row.append((text, self.current_rowspan))
            
            # Track rowspan if > 1
            if self.current_rowspan > 1:
                self.active_rowspans.append((self.current_rowspan - 1, self.current_col, text))
            
            self.current_col += 1
            self.in_cell = False
            
        elif tag == "tr" and self.in_row:
            # Fill any remaining columns that are occupied by rowspans
            while self.current_col < 6:
                occupied = False
                for i, (remaining, col, value) in enumerate(self.active_rowspans):
                    if remaining > 0 and col == self.current_col:
                        # This column is occupied by a rowspan
                        self.current_row.append(("", 1))
                        self.active_rowspans[i] = (remaining - 1, col, value)
                        self.current_col += 1
                        occupied = True
                        break
                if not occupied:
                    # No more occupied columns, fill remaining with empty
                    self.current_row.append(("", 1))
                    self.current_col += 1
            
            # Clean up rowspans that are no longer active
            self.active_rowspans = [
                (remaining, col, value)
                for remaining, col, value in self.active_rowspans
                if remaining > 0
            ]
            
            # Add completed row to results
            if self.current_row:
                self.rows.append(self.current_row)
            self.in_row = False

    def handle_data(self, data: str) -> None:
        """Handle text data within HTML elements."""
        if self.in_cell:
            self.current_cell.append(data)

    def handle_comment(self, data: str) -> None:
        """Handle HTML comments. Track <!-- span --> markers for vertically stacked classes."""
        if self.in_row and self.in_tbody:
            # Check if this is a span marker comment
            comment_text = data.strip().lower()
            if comment_text == "span":
                self.pending_span_marker = True

    @staticmethod
    def _is_target_table(attrs: List[tuple[str, Optional[str]]]) -> bool:
        """Check if a table element is the schedule table we're looking for.
        
        Looks for tables with id starting with 'table_' or class containing 'odd_table'.
        """
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


def build_schedule(rows: List[List[Tuple[str, int]]]) -> Dict[str, Any]:
    schedule_rows: List[Dict[str, Any]] = []
    for row in rows:
        if not row:
            continue
        # First cell is the time slot
        time_tuple = row[0]
        time_value = time_tuple[0].strip() if time_tuple[0] else ""
        if not time_value:
            continue

        # Remaining cells are days (Monday-Friday)
        day_cells = row[1:]
        # Pad with empty tuples if fewer than 5 days
        if len(day_cells) < len(DAY_KEYS):
            day_cells = day_cells + [("", 1)] * (len(DAY_KEYS) - len(day_cells))

        entry: Dict[str, Any] = {"time": time_value}
        # Convert each day's subject text to standardized format
        for idx, day in enumerate(DAY_KEYS):
            cell_content, cell_rowspan = day_cells[idx]
            subject = subject_from_text(cell_content)
            
            # Add rowspan property if > 1
            if subject and cell_rowspan > 1:
                subject["rowspan"] = cell_rowspan
            
            entry[day] = subject

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


def build_app_config_script(class_id: str) -> str:
    return (
        "    <script>\n"
        f'        window.AppConfig = {{ classId: "{class_id}", dataPath: "../data/" }};\n'
        "    </script>"
    )


def replace_inline_app_config(html_content: str, class_id: str) -> str:
    pattern = re.compile(
        r"<script>\s*(?:window\.CLASS_ID[\s\S]*?window\.AppConfig[\s\S]*?|window\.AppConfig[\s\S]*?)</script>",
        re.MULTILINE,
    )
    replacement = build_app_config_script(class_id)

    if pattern.search(html_content):
        return pattern.sub(replacement, html_content, count=1)

    return html_content


def build_class_html(class_id: str, template_path: Path = None) -> Path:
    """Build HTML file for a class by copying template and replacing class ID.
    
    Args:
        class_id: The class identifier (e.g., "8a", "8b", "8c")
        template_path: Path to the template HTML file (default: 8d/index.html)
    
    Returns:
        Path to the newly created HTML file
    """
    if template_path is None:
        template_path = Path("8d/index.html")
    
    if not template_path.exists():
        raise FileNotFoundError(f"Template file not found: {template_path}")
    
    # Read the template
    with template_path.open("r", encoding="utf-8") as f:
        html_content = f.read()
    
    # Create class ID with capital letter for display (e.g., "8D" from "8d")
    display_id = class_id.upper()
    
    # Replace inline app config script with the simplified AppConfig shape
    html_content = replace_inline_app_config(html_content, class_id)

    # Replace title text "Orar 8D" -> "Orar 8A" etc.
    html_content = re.sub(
        r'<title>Orar 8D</title>',
        f'<title>Orar {display_id}</title>',
        html_content
    )
    
    # Replace mobile header title "Orar 8D"
    html_content = re.sub(
        r'class="mobile-app-title">Orar 8D</h1>',
        f'class="mobile-app-title">Orar {display_id}</h1>',
        html_content
    )
    
    # Replace main title "Orar 8D"
    html_content = re.sub(
        r'class="main-title">Orar 8D</h1>',
        f'class="main-title">Orar {display_id}</h1>',
        html_content
    )
    
    # Replace "About Orar 8D" in info overlay
    html_content = re.sub(
        r'About Orar 8D',
        f'About Orar {display_id}',
        html_content
    )
    
    # Replace URL references to 8d (e.g., https://s27.ro/8d)
    html_content = re.sub(
        r'https://s27\.ro/8d',
        f'https://s27.ro/{class_id}',
        html_content
    )
    
    # Create output directory
    output_dir = Path(class_id)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write the modified HTML
    output_path = output_dir / "index.html"
    with output_path.open("w", encoding="utf-8", newline="\n") as f:
        f.write(html_content)
    
    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch class schedule and output JSON format.")
    parser.add_argument("--url", help="Schedule URL (default: https://s27.ro/<class-id>)")
    parser.add_argument("--class-id", default="8d", help="Class id for default URL/output")
    parser.add_argument("--out", help="Output path (default: data/<class-id>.json)")
    parser.add_argument("--check", action="store_true", help="Only check if schedule changed")
    parser.add_argument("--build-html", action="store_true", help="Build HTML file for class from template")
    parser.add_argument("--template", help="Template HTML file path (default: 8d/index.html)")
    parser.add_argument("--force", action="store_true", help="Skip confirmation prompt and update automatically")

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

    # Determine if we should save
    should_save = False

    if args.force:
        # Force mode: save regardless of changes, skip confirmation
        print("Force flag set, skipping confirmation and saving.")
        should_save = True
    elif not changed:
        # No changes detected, skip saving
        return 0
    else:
        # Changes detected, prompt for confirmation
        try:
            choice = input("Update schedule file? [y/N]: ").strip().lower()
        except EOFError:
            choice = ""

        if choice in {"y", "yes"}:
            should_save = True

    if should_save:
        save_json(out_path, new_data)

    # Build HTML if requested
    if args.build_html:
        template_path = Path(args.template) if args.template else None
        try:
            output_path = build_class_html(class_id, template_path)
            print(f"Built HTML for class {class_id}: {output_path}")
        except FileNotFoundError as e:
            print(f"Error: {e}")
            return 1

    return 0


# Run the script
if __name__ == "__main__":
    sys.exit(main())
