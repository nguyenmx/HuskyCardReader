"""
Flask server for Husky Card Reader.
- Serves the dashboard (index.html, app.js, etc.)
- Reads card swipes from stdin (card reader keyboard emulation)
- Broadcasts new swipes to all connected browsers via Server-Sent Events (SSE)
- Appends each swipe to output.csv so data persists across restarts

Run:
    pip install flask
    python server.py

Then open http://localhost:5000 in your browser.
Keep the terminal window focused when swiping cards.
"""

import re
import sys
import json
import csv
import os
import queue
import threading
from datetime import datetime
from flask import Flask, Response, send_from_directory

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, "live-card-data", "output.csv")
CSV_FIELDS = ["id", "name", "time", "date"]

# Per-client SSE queues
_subscribers = []
_subscribers_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Card parsing (same logic as magtek-reader-test.py)
# ---------------------------------------------------------------------------

def parse_swipe(raw_input):
    """Return (id_number, id_type) from a raw swipe string."""
    raw = raw_input.strip()
    if "E?" in raw:
        return None, "error"
    # Husky card format: ;XXXXXXXXXXXXXX? (14-digit track)
    # Staff:   remove first 2 chars (;+1 prefix digit) and last 5 (4 suffix digits+?) → 9-digit ID
    # Student: remove first 4 chars (;+3 prefix digits) and last 5 (4 suffix digits+?) → 7-digit ID
    match = re.search(r";(\d{14})\?", raw)
    if match:
        digits = match.group(1)
        if digits[0] == "2":
            return digits[1:-4], "staff"
        else:
            return digits[3:-4], "student"
    # Staff: exactly 9 digits
    match = re.search(r"(?<!\d)(\d{9})(?!\d)", raw)
    if match:
        return match.group(1), "staff"
    # Student: exactly 7 digits
    match = re.search(r"(?<!\d)(\d{7})(?!\d)", raw)
    if match:
        return match.group(1), "student"
    return None, "invalid"


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def load_csv():
    if not os.path.exists(CSV_FILE):
        return []
    with open(CSV_FILE, newline="") as f:
        return list(csv.DictReader(f))


def append_csv(swipe):
    os.makedirs(os.path.dirname(CSV_FILE), exist_ok=True)
    file_exists = os.path.exists(CSV_FILE)
    with open(CSV_FILE, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if not file_exists:
            writer.writeheader()
        writer.writerow({k: swipe[k] for k in CSV_FIELDS})


# ---------------------------------------------------------------------------
# SSE broadcast helpers
# ---------------------------------------------------------------------------

def _add_subscriber():
    q = queue.Queue()
    with _subscribers_lock:
        _subscribers.append(q)
    return q


def _remove_subscriber(q):
    with _subscribers_lock:
        if q in _subscribers:
            _subscribers.remove(q)


def _broadcast(swipe):
    with _subscribers_lock:
        for q in _subscribers:
            q.put(swipe)


# ---------------------------------------------------------------------------
# Background thread: read card swipes from stdin
# ---------------------------------------------------------------------------

def _card_reader_loop():
    print("[server] Card reader ready — keep this terminal focused when swiping.", flush=True)
    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue

        id_number, id_type = parse_swipe(raw)

        if id_type == "error":
            print("[server] Swipe error (too fast) — please try again.", flush=True)
            continue

        if id_number is None:
            print(f"[server] Unrecognized swipe: {repr(raw)}", flush=True)
            continue

        now = datetime.now()
        swipe = {
            "id": id_number,
            "name": "NULL",
            "time": now.strftime("%H:%M:%S"),
            "date": now.strftime("%Y-%m-%d"),
            "type": id_type,
        }

        append_csv(swipe)
        _broadcast(swipe)
        print(f"Raw swipe  : {repr(raw)}", flush=True)
        print(f"Extracted  : {id_number} ({id_type})", flush=True)
        print(flush=True)


# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)


@app.route("/stream")
def stream():
    """Server-Sent Events endpoint — each connected browser gets its own queue."""
    q = _add_subscriber()

    def event_generator():
        try:
            while True:
                swipe = q.get()          # blocks until a swipe arrives
                yield f"data: {json.dumps(swipe)}\n\n"
        except GeneratorExit:
            pass
        finally:
            _remove_subscriber(q)

    return Response(
        event_generator(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering if proxied
        },
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    reader_thread = threading.Thread(target=_card_reader_loop, daemon=True)
    reader_thread.start()

    print("[server] Dashboard → http://localhost:5000", flush=True)
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True, use_reloader=False)
