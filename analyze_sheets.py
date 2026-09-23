import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\LENOVO\Desktop\khachsan\s2_full_dump.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total sheets: {len(data['sheets'])}")
for sheet in data["sheets"]:
    name = sheet["sheetname"]
    rows = sheet["rows"]
    print(f"\n==========================================")
    print(f"Sheet Name: '{name}' | Total non-empty rows: {len(rows)}")
    print(f"==========================================")
    for r in rows[:15]:
        # print first 15 columns
        vals = r["values"][:15]
        forms = [f for f in r["formulas"][:15] if f.startswith("=")]
        print(f"Row {r['row']:02d}: {vals}")
        if forms:
            print(f"   Formulas: {forms}")
