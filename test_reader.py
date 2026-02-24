"""
test_reader.py
Verifies that the OMNIKEY 5422 is detected by the PC/SC subsystem
and prints basic info about any card placed on the reader.

Requirements:
    pip install pyscard
"""

from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.Exceptions import CardConnectionException, NoCardException


def list_readers():
    available = readers()
    if not available:
        print("[ERROR] No smart card readers found.")
        print("        Make sure the OMNIKEY 5422 driver is installed and the")
        print("        'Smart Card' Windows service (SCardSvr) is running.")
        return []

    print(f"Found {len(available)} reader(s):")
    for i, r in enumerate(available):
        print(f"  [{i}] {r}")
    return available


def read_atr(reader):
    """Connect to a card and return its ATR bytes."""
    connection = reader.createConnection()
    try:
        connection.connect()
        atr = connection.getATR()
        print(f"\n[OK] Card detected on: {reader}")
        print(f"     ATR : {toHexString(atr)}")
        print(f"     Look up ATR at: https://smartcard-atr.apdu.fr/")
        connection.disconnect()
        return atr
    except NoCardException:
        print(f"\n[INFO] No card present on: {reader}")
        return None
    except CardConnectionException as e:
        print(f"\n[ERROR] Could not connect to card: {e}")
        return None


if __name__ == "__main__":
    print("=== OMNIKEY 5422 — Reader Detection Test ===\n")
    available = list_readers()
    if not available:
        raise SystemExit(1)

    print("\nPlace a card on the reader, then press Enter...")
    input()

    for r in available:
        read_atr(r)
