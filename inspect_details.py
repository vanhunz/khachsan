import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\LENOVO\Desktop\khachsan\s2_full_dump.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for sheet in data["sheets"]:
    name = sheet["sheetname"]
    rows = sheet["rows"]
    if name in ['đặt phòng', 'test', 'T8']:
        print(f"\n=======================================================")
        print(f"SHEET: '{name}'")
        print(f"=======================================================")
        for r in rows[:15]:
            print(f"Row {r['row']}:")
            print(f"   Cols 1-14: {r['values'][:14]}")
            print(f"   Cols 15-25: {r['values'][14:25]}")
            forms = [f for f in r['formulas'] if f.startswith("=")]
            if forms:
                print(f"   Formulas: {forms}")
