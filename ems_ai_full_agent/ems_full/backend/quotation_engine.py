import pandas as pd
import math

COLUMN_ALIASES = {
    "ref":          ["Designator", "Ref. Des.", "Ref", "Reference", "RefDes"],
    "description":  ["Designation", "Description", "Value", "Component", "Desc"],
    "mpn":          ["MPN", "Mfr Part", "Part Number", "Part No"],
    "manufacturer": ["MFR", "Manufacturer", "Maker", "Mfr"],
    "package":      ["Footprint", "Package", "Pkg"],
    "qty":          ["Quantity", "Qty", "Count", "QTY"],
    "unit_price":   ["Unit Price", "Unit_Price", "Price", "Unit Cost", "Unit €", "Price (€)"],
    "mount":        ["Mount", "Mount Type", "Assembly"],
    "dnp":          ["DNP"],
    "supplier_url": ["Supplier and ref", "Supplier URL", "Supplier", "Digikey URL"],
}

def find_column(df_columns, aliases):
    df_cols_lower = [c.lower().strip() for c in df_columns]
    for alias in aliases:
        alias_lower = alias.lower().strip()
        for i, col in enumerate(df_cols_lower):
            if alias_lower == col or alias_lower in col or col in alias_lower:
                return df_columns[i]
    return None

def safe_float(value):
    try:
        result = float(value)
        if math.isnan(result) or math.isinf(result):
            return 0.0
        return result
    except (TypeError, ValueError):
        return 0.0

def safe_str(value, fallback="—"):
    if value is None:
        return fallback
    try:
        if math.isnan(float(value)):
            return fallback
    except (TypeError, ValueError):
        pass
    s = str(value).strip()
    return s if s else fallback

def process_bom(filepath):
    df = pd.read_excel(filepath)
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how="all")

    print(">>> BOM columns found:", list(df.columns))

    col = {}
    for field, aliases in COLUMN_ALIASES.items():
        col[field] = find_column(list(df.columns), aliases)
        print(f"    {field:15s} -> {col[field]}")

    results = []
    total_cost = 0.0
    issues = []

    for index, row in df.iterrows():
        ref          = safe_str(row[col["ref"]]          if col["ref"]          else None)
        description  = safe_str(row[col["description"]]  if col["description"]  else None)
        mpn          = safe_str(row[col["mpn"]]          if col["mpn"]          else None, fallback="TBD")
        manufacturer = safe_str(row[col["manufacturer"]] if col["manufacturer"] else None)
        package      = safe_str(row[col["package"]]      if col["package"]      else None)
        qty          = safe_float(row[col["qty"]]         if col["qty"]          else 1)
        unit_price   = safe_float(row[col["unit_price"]]  if col["unit_price"]   else None)
        mount        = safe_str(row[col["mount"]]        if col["mount"]        else None, fallback="SMD")
        dnp          = safe_str(row[col["dnp"]]          if col["dnp"]          else None, fallback="N").upper()
        supplier_url = safe_str(row[col["supplier_url"]] if col["supplier_url"] else None, fallback="")

        if ref == "—" and description == "—":
            continue

        ext_price = round(qty * unit_price, 4)

        if dnp != "Y":
            total_cost += ext_price

        if mpn == "TBD" or mpn == "—":
            issues.append({"type": "error", "ref": ref, "message": f"{ref}: Missing MPN"})
        if unit_price == 0.0 and dnp != "Y":
            issues.append({"type": "warning", "ref": ref, "message": f"{ref}: No unit price"})

        results.append({
            "id":           index + 1,
            "ref":          ref,
            "description":  description,
            "mpn":          mpn,
            "manufacturer": manufacturer,
            "package":      package,
            "qty":          int(qty) if qty == int(qty) else qty,
            "unit_price":   unit_price,
            "ext_price":    ext_price,
            "mount":        mount,
            "dnp":          dnp,
            "supplier_url": supplier_url,
        })

    active   = [r for r in results if r["dnp"] != "Y"]
    dnp_rows = [r for r in results if r["dnp"] == "Y"]

    return {
        "bom":        results,
        "total_cost": round(total_cost, 2),
        "issues":     issues,
        "stats": {
            "total_lines":  len(results),
            "active_lines": len(active),
            "dnp_lines":    len(dnp_rows),
            "issue_count":  len(issues),
        }
    }
