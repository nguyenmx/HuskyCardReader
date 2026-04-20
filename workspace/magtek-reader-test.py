"""
Staff has 9-digits number and student has 7-digit number.
So we can use the length of the number to determine if it's a staff or student.
For the student, there are 3 characters before the 7-digit number, the first digit is a ;
    and 4 characters at the end with a ? at the end.
For the staff, there are 2 characters before the 9-digit number, the first digit is a ;
    and 4 characters at the end with a ? at the end.
Need a way to omit data that is less than 7 digits or more than 9 digits.
E? means error, person swiped too fast
If you swipe consectively, the card reader may add another ; in the front
"""

import re


def parse_swipe(raw_input):
    """
    Extract a student or staff ID from raw magnetic card swipe data.

    Returns:
        (id_number, id_type) where id_type is 'student', 'staff', 'error', or 'invalid'
    """
    raw = raw_input.strip()

    # Swipe-too-fast error
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

    # Search for exactly 9 consecutive digits (staff) — check this first so a
    # 9-digit number isn't accidentally matched as a 7-digit substring.
    match = re.search(r"(?<!\d)(\d{9})(?!\d)", raw)
    if match:
        return match.group(1), "staff"

    # Search for exactly 7 consecutive digits (student)
    match = re.search(r"(?<!\d)(\d{7})(?!\d)", raw)
    if match:
        return match.group(1), "student"

    return None, "invalid"


def main():
    print("Husky Card Reader — Swipe a card (Ctrl+C to quit)")
    print("-" * 48)

    try:
        while True:
            raw = input()       # card reader keyboards data then presses Enter
            if not raw:
                continue

            id_number, id_type = parse_swipe(raw)

            if id_type == "error":
                print("  [ERROR]   Swipe too fast — please try again")
            elif id_type == "staff":
                print(f"  [STAFF]   ID: {id_number}")
            elif id_type == "student":
                print(f"  [STUDENT] ID: {id_number}")
            else:
                print(f"  [INVALID] Could not parse: {repr(raw)}")

    except KeyboardInterrupt:
        print("\nExiting.")


if __name__ == "__main__":
    main()
