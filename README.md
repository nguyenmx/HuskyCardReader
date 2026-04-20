# Husky Card Reader

A live dashboard that reads UW Husky Card swipes from a MagTek card reader, extracts student/staff IDs, logs them to a CSV, and displays the data in real time using the [Tabler](https://tabler.io/) UI framework.

## Prerequisites

- Python 3
- A MagTek card reader (keyboard-emulation mode)

### Install Python dependencies

```bash
pip install flask pandas openpyxl
```

## Project Structure

```
husky-card-reader/
  server.py                      # Flask server: reads card swipes, writes CSV, streams updates
  index.html                     # Dashboard page (Tabler layout)
  app.js                         # JavaScript: loads CSV, renders charts/table, listens for live updates
  search_resources.html          # Resource search page
  output/
    output.csv                   # Swipe log — created automatically on first swipe
  data/
    student-test-data.xlsx       # Test Excel data
    output.csv                   # CSV generated from Excel data
  workspace/
    convert-xlsx-csv.py          # One-time utility to convert Excel data to CSV
    magtek-reader-test.py        # Standalone card reader test script (no server)
```

## Running the Server

Plug in the MagTek card reader, then start the Flask server:

```bash
python server.py
```

Keep the terminal window focused — the card reader sends keystrokes to whichever window is active.

Open **http://localhost:5000** in your browser to view the live dashboard.

## How Card Parsing Works

The MagTek reader emits raw magnetic stripe data. The server (`server.py`) parses three formats:

| Format | Raw example | Extracted ID | Type |
|--------|-------------|--------------|------|
| Husky Card student (14-digit track) | `;10012345672510?` | `xxxxxxxx` | student |
| Husky Card staff (14-digit track) | `;2xxxxxxxxx3610?` | `xxxxxxxxxx` | staff |
| Legacy student | `;1234567?` | `1234567` | student |
| Legacy staff | `;123456789?` | `123456789` | staff |
| Too-fast swipe | `...E?...` | — | error (retry prompt) |

For the 14-digit Husky Card format, the server distinguishes staff from student by the first digit of the track data (after `;`):
- **Student** (first digit ≠ `2`): strip 4 leading chars (`;` + 3 prefix digits) and 5 trailing chars (4 suffix digits + `?`) → 7-digit ID
- **Staff** (first digit = `2`): strip 2 leading chars (`;` + 1 prefix digit) and 5 trailing chars (4 suffix digits + `?`) → 9-digit ID

## What Happens on Each Swipe

1. **Terminal** — prints the raw swipe and extracted ID
2. **output.csv** — a new row is appended with `id`, `name`, `time`, and `date`
3. **Browser** — the dashboard updates instantly via Server-Sent Events (SSE): the new entry appears highlighted at the top of the Swipe Log, and all charts and summary cards refresh automatically

## CSV Format

`output.csv` is created automatically. Columns:

| Column | Description             | Example      |
|--------|-------------------------|--------------|
| id     | Extracted ID (numeric)  | XXXXXXX      |
| name   | Name (NULL until looked up) | NULL    |
| time   | Swipe time (HH:MM:SS)   | 13:45:02     |
| date   | Swipe date (YYYY-MM-DD) | 2026-04-20   |

## Loading Historical Data (Optional)

To pre-populate the dashboard from an Excel file:

```bash
python convert-xlsx-csv.py
```

This converts `student-test-data.xlsx` into `output.csv`. Any subsequent live swipes will be appended to the same file.
