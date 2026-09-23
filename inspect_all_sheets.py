import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\LENOVO\Desktop\khachsan\s2_full_dump.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for sheet in data["sheets"]:
    name = sheet["sheetname"]
    rows = sheet["rows"]
    print(f"\n=======================================================")
    print(f"SHEET: '{name}' (Total non-empty rows in dump: {len(rows)})")
    print(f"=======================================================")
    for r in rows[:6]:
        print(f"Row {r['row']}: {r['values'][:16]}")
        forms = [f for f in r['formulas'][:16] if f.startswith("=")]
        if forms:
            print(f"   Formulas: {forms}")
