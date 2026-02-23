# Husky Card Reader

A dashboard that displays student card-swipe data using the [Tabler](https://tabler.io/) UI framework.

## Prerequisites

- Python 3 with `pandas` and `openpyxl`
- A local web server (e.g., VSCode Live Server extension)

### Install Python dependencies

```bash
pip install pandas openpyxl
```

## Project Structure

```
husky-card-reader/
  index.html               # Dashboard page (Tabler layout)
  app.js                   # JavaScript logic (CSV parsing, table rendering)
  convert-xlsx-csv.py      # Converts Excel data to CSV
  student-test-data.xlsx   # Source Excel file
  output.csv               # Generated CSV (created by the script)
```

## Setup

### 1. Convert Excel to CSV

Place your Excel file as `student-test-data.xlsx` in the project folder, then run:

```bash
python convert-xlsx-csv.py
```

This generates `output.csv` with the following expected columns:

| Column | Description              | Example    |
|--------|--------------------------|------------|
| id     | Student ID (numeric)     | 7655475    |
| name   | Student name             | bob        |
| time   | Swipe time (HH:MM:SS)   | 13:00:00   |

### 2. Serve the page

The dashboard must be served over HTTP (not opened as a local file) because it fetches `output.csv` at runtime.

**Using VSCode Live Server:**

1. Install the "Live Server" extension in VSCode
2. Right-click `index.html` and select "Open with Live Server"

**Using Python:**

```bash
cd husky-card-reader
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Updating Data

To refresh the dashboard with new data:

1. Replace `student-test-data.xlsx` with the updated Excel file
2. Re-run `python convert-xlsx-csv.py`
3. Reload the page in your browser
