import os
import sys
import json

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

file_path = os.path.abspath(r"c:\Users\LENOVO\Desktop\khachsan\S2_final.xlsm")
password = "2804"

import win32com.client

print(f"Opening {file_path} with Excel COM...")
excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False
excel.DisplayAlerts = False

try:
    wb = excel.Workbooks.Open(file_path, False, True, None, password)
    print("Workbook opened successfully!")
    
    workbook_data = {
        "sheets": []
    }
    
    for i in range(1, wb.Sheets.Count + 1):
        ws = wb.Sheets(i)
        sheet_name = ws.Name
        print(f"\nProcessing Sheet {i}: {sheet_name}")
        
        used_range = ws.UsedRange
        max_row = min(used_range.Rows.Count, 150)
        max_col = min(used_range.Columns.Count, 30)
        
        sheet_info = {
            "name": sheet_name,
            "max_row": max_row,
            "max_col": max_col,
            "rows": []
        }
        
        for r in range(1, max_row + 1):
            row_vals = []
            row_formulas = []
            row_colors = []
            has_data = False
            for c in range(1, max_col + 1):
                cell = ws.Cells(r, c)
                val = cell.Value
                formula = cell.Formula
                color = cell.Interior.Color
                
                # Format datetime or None
                val_str = str(val) if val is not None else ""
                form_str = str(formula) if formula is not None and formula != val else ""
                
                if val is not None:
                    has_data = True
                
                row_vals.append(val_str)
                row_formulas.append(form_str)
                row_colors.append(color)
                
            if has_data:
                sheet_info["rows"].append({
                    "row_idx": r,
                    "values": row_vals,
                    "formulas": row_formulas,
                    "colors": row_colors
                })
        
        workbook_data["sheets"].append(sheet_info)
        print(f"Sheet {sheet_name} has {len(sheet_info['rows'])} rows with data.")

    # Also check VBA Project components if possible
    try:
        vba_modules = []
        for component in wb.VBProject.VBComponents:
            mod_name = component.Name
            mod_type = component.Type
            code_lines = []
            code_module = component.CodeModule
            if code_module.CountOfLines > 0:
                code_text = code_module.Lines(1, code_module.CountOfLines)
                code_lines.append(code_text)
            vba_modules.append({
                "name": mod_name,
                "type": mod_type,
                "code": "\n".join(code_lines)
            })
        workbook_data["vba_modules"] = vba_modules
        print(f"Extracted {len(vba_modules)} VBA modules.")
    except Exception as vba_e:
        print(f"VBA extraction notice (access to VBA project may be restricted): {vba_e}")

    wb.Close(False)
    excel.Quit()
    
    output_json_path = r"c:\Users\LENOVO\Desktop\khachsan\excel_dump.json"
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(workbook_data, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully wrote dump to {output_json_path}")

except Exception as e:
    print("Error during Excel dump:", e)
    try:
        excel.Quit()
    except:
        pass
