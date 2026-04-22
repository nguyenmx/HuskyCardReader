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
│
├── server.py                    # Flask server: reads card swipes, writes CSV, streams SSE updates
├── index.html                   # Main dashboard page (Tabler UI layout)
├── search_resources.html        # Resource search page
├── app.js                       # Entry point: loads CSV data, wires up components, listens for live updates
│
├── components/                  # UI component modules (loaded by index.html)
│   ├── Dashboard.js             # Renders summary cards, charts, and the swipe table
│   ├── Filters.js               # Populates and handles year/type filter controls
│   └── SwipeLog.js              # Manages the live swipe log and highlights new entries
│
├── student-card-data/           # Live swipe data
│   └── output.csv               # Swipe log — created automatically on first swipe
│
├── excel-test-data/             # Test data for development
│   ├── student-test-data.xlsx   # Source Excel file
│   └── output.csv               # CSV converted from the Excel file
│
└── workspace/                   # Utility scripts (not served)
    ├── convert-xlsx-csv.py      # One-time script to convert Excel data to CSV
    └── magtek-reader-test.py    # Standalone card reader test (no server needed)
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
| Husky Card student (14-digit track) | `;100xxxxxxx10?` | `xxxxxxxx` | student |
| Husky Card staff (14-digit track) | `;2xxxxxxxxx3610?` | `xxxxxxxxxx` | staff |
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

## Using an Existing CSV File

To render data from your own CSV file:

1. Drop the CSV into the `student-card-data/` folder.
2. In `app.js`, update the path passed to `Papa.parse` to point to your file:

```js
Papa.parse("student-card-data/your-file.csv", {
```

The CSV must have the same columns as the standard format (`id`, `name`, `time`, `date`). Reload the dashboard in your browser to see the data.
