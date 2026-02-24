"""
test_read_card.py
Reads a Husky Card (NXP DESFire / ISO 14443-A) and attempts to extract
the student ID.

ATR identified: 3B 81 80 01 80 80  →  NXP DESFire (EV1 / EV2)

DESFire cards organise data as:  Card → Applications (3-byte AID) → Files
This script:
  1. Gets the card UID
  2. Lists all DESFire Application IDs on the card
  3. Selects each application and lists its files
  4. Reads any unprotected Standard Data files (student ID is often here)

Requirements:
    pip install pyscard
"""

from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.Exceptions import CardConnectionException, NoCardException

# ── DESFire native commands wrapped in ISO 7816-4 ────────────────────────────
# CLA=0x90 means "DESFire native command"
GET_UID             = [0xFF, 0xCA, 0x00, 0x00, 0x00]   # PC/SC UID fetch
DESFIRE_GET_APP_IDS = [0x90, 0x6A, 0x00, 0x00, 0x00]   # List all AIDs
DESFIRE_GET_FILE_IDS= [0x90, 0x6F, 0x00, 0x00, 0x00]   # List files in app
DESFIRE_GET_FILE_SET= [0x90, 0xF5, 0x00, 0x00, 0x01]   # Get file settings (+ file no appended)

def desfire_select_app(aid_bytes):
    """Build SELECT APPLICATION command for a 3-byte DESFire AID."""
    return [0x90, 0x5A, 0x00, 0x00, 0x03] + list(aid_bytes) + [0x00]

def desfire_read_data(file_no, offset=0, length=32):
    """Build READ DATA command for a Standard Data file."""
    off = [(offset >> s) & 0xFF for s in (0, 8, 16)]   # 3-byte little-endian
    lng = [(length >> s) & 0xFF for s in (0, 8, 16)]
    return [0x90, 0xBD, 0x00, 0x00, 0x07, file_no] + off + lng + [0x00]
# ─────────────────────────────────────────────────────────────────────────────


def send_apdu(connection, apdu, label="APDU", verbose=True):
    data, sw1, sw2 = connection.transmit(apdu)
    if verbose:
        status = f"{sw1:02X} {sw2:02X}"
        if data:
            print(f"    {label}: {toHexString(data)}  SW={status}")
        else:
            print(f"    {label}: SW={status}")
    return data, sw1, sw2


def try_decode_student_id(raw_bytes):
    """
    Attempt common student-ID encodings from raw bytes.
    DESFire files are little-endian; many campus systems store a
    4-byte or 8-byte integer, sometimes ASCII, sometimes BCD.
    """
    results = {}
    if len(raw_bytes) >= 4:
        results["uint32 LE"] = int.from_bytes(raw_bytes[:4], "little")
        results["uint32 BE"] = int.from_bytes(raw_bytes[:4], "big")
    if len(raw_bytes) >= 8:
        results["uint64 LE"] = int.from_bytes(raw_bytes[:8], "little")
    try:
        text = bytes(raw_bytes).decode("ascii").strip("\x00").strip()
        if text.isprintable():
            results["ASCII"] = text
    except Exception:
        pass
    return results


def read_card(reader):
    connection = reader.createConnection()
    try:
        connection.connect()
    except NoCardException:
        print("[INFO] No card detected. Place your Husky Card and re-run.")
        return
    except CardConnectionException as e:
        print(f"[ERROR] Connection failed: {e}")
        return

    print(f"\nConnected  →  {reader}")

    # ── 1. Card UID ───────────────────────────────────────────────────────────
    print("\n[1] Card UID")
    uid_data, sw1, _ = send_apdu(connection, GET_UID, "UID")
    if sw1 == 0x90 and uid_data:
        print(f"    Hex     : {toHexString(uid_data)}")
        print(f"    Decimal : {int.from_bytes(uid_data, 'big')}")

    # ── 2. List DeSFire applications ──────────────────────────────────────────
    print("\n[2] DESFire Application IDs")
    app_data, sw1, sw2 = send_apdu(connection, DESFIRE_GET_APP_IDS, "GET_APPLICATION_IDS")

    if sw1 != 0x91 or sw2 != 0x00:
        print("    Could not list applications (card may require authentication).")
        connection.disconnect()
        return

    # AIDs are 3 bytes each
    aids = [app_data[i:i+3] for i in range(0, len(app_data), 3)]
    print(f"    Found {len(aids)} application(s): {[toHexString(a) for a in aids]}")

    # ── 3. Explore each application ───────────────────────────────────────────
    for aid in aids:
        aid_str = toHexString(aid)
        print(f"\n[3] Application {aid_str}")

        sel_cmd = desfire_select_app(aid)
        _, sw1, sw2 = send_apdu(connection, sel_cmd, f"SELECT {aid_str}")
        if not (sw1 == 0x91 and sw2 == 0x00):
            print(f"    Could not select application {aid_str}, skipping.")
            continue

        # List files
        file_data, sw1, sw2 = send_apdu(connection, DESFIRE_GET_FILE_IDS, "GET_FILE_IDS")
        if sw1 != 0x91 or sw2 != 0x00:
            print("    Could not list files (may require authentication).")
            continue

        print(f"    File IDs: {toHexString(file_data) if file_data else 'none'}")

        # Try reading each file
        for file_no in file_data:
            print(f"\n    File 0x{file_no:02X}")
            read_cmd = desfire_read_data(file_no, offset=0, length=32)
            raw, sw1, sw2 = send_apdu(connection, read_cmd, f"  READ file 0x{file_no:02X}")

            if sw1 == 0x91 and sw2 == 0x00 and raw:
                decoded = try_decode_student_id(raw)
                print(f"      Raw hex : {toHexString(raw)}")
                for enc, val in decoded.items():
                    print(f"      {enc:<12}: {val}")
            elif sw1 == 0x91 and sw2 == 0xAE:
                print(f"      Access denied — file requires authentication.")
            else:
                print(f"      Could not read file.")

    connection.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    print("=== OMNIKEY 5422 — Husky Card (DESFire) Read Test ===\n")

    available = readers()
    if not available:
        print("[ERROR] No readers found. Run test_reader.py first.")
        raise SystemExit(1)

    # Prefer the contactless slot (shows as "... CL 0" on OMNIKEY 5422)
    target = None
    for r in available:
        name = str(r)
        if "CL 0" in name or "Contactless" in name or "PICC" in name or name.endswith("1"):
            target = r
            break
    if target is None:
        target = available[-1]  # OMNIKEY 5422: last slot is contactless

    print(f"Using reader : {target}")
    print("Place your Husky Card on the reader, then press Enter...")
    input()

    read_card(target)