# ==========================================
# PDF BOM PARSER
# Extracts component tables from PDF BOMs
# Uses pdfplumber for table detection
# ==========================================

import pdfplumber
import pandas as pd
import math
import re


def safe_float(value):
    try:
        result = float(str(value).strip().replace(",", ""))
        if math.isnan(result) or math.isinf(result):
            return 0.0
        return result
    except:
        return 0.0


def safe_str(value, fallback="—"):
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s else fallback


# Column aliases — same as quotation_engine.py
COLUMN_ALIASES = {
    "ref":          ["Designator", "Ref. Des.", "Ref", "Reference", "RefDes"],
    "description":  ["Designation", "Description", "Value", "Component", "Desc"],
    "mpn":          ["MPN", "Mfr Part", "Part Number", "Part No"],
    "manufacturer": ["MFR", "Manufacturer", "Maker"],
    "package":      ["Footprint", "Package", "Pkg"],
    "qty":          ["Quantity", "Qty", "Count", "QTY"],
    "unit_price":   ["Unit Price", "Unit_Price", "Price", "Unit Cost"],
    "mount":        ["Mount", "Mount Type", "Assembly"],
    "dnp":          ["DNP"],
}


def find_column(headers, aliases):
    headers_lower = [str(h).lower().strip() for h in headers]
    for alias in aliases:
        alias_lower = alias.lower().strip()
        for i, h in enumerate(headers_lower):
            if alias_lower == h or alias_lower in h or h in alias_lower:
                return i
    return None


def extract_tables_from_pdf(filepath):
    """
    Extract all tables from a PDF file.
    Returns the largest table found (most likely the BOM).
    """
    all_tables = []

    with pdfplumber.open(filepath) as pdf:
        print(f"PDF has {len(pdf.pages)} pages")

        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables:
                if table and len(table) > 2:  # skip tiny tables
                    all_tables.append({
                        "page":  page_num + 1,
                        "table": table,
                        "rows":  len(table),
                    })
                    print(f"  Page {page_num+1}: found table with {len(table)} rows")

    if not all_tables:
        return None

    # return the biggest table — most likely the BOM
    biggest = max(all_tables, key=lambda x: x["rows"])
    print(f"  Using table from page {biggest['page']} with {biggest['rows']} rows")
    return biggest["table"]


def parse_pdf_bom(filepath):
    """
    Main function — extracts BOM from PDF and returns
    same format as quotation_engine.process_bom()
    """
    print(f">>> Parsing PDF BOM: {filepath}")

    # extract table
    raw_table = extract_tables_from_pdf(filepath)

    if not raw_table:
        raise ValueError("No tables found in PDF. Make sure the BOM has a proper table structure.")

    # first row is likely the header
    # find the header row — look for row with component keywords
    header_row_idx = 0
    for i, row in enumerate(raw_table[:5]):
        row_lower = [str(c).lower().strip() for c in (row or [])]
        if any(k in " ".join(row_lower) for k in ["ref", "mpn", "description", "qty", "designator"]):
            header_row_idx = i
            break

    headers   = raw_table[header_row_idx]
    data_rows = raw_table[header_row_idx + 1:]

    print(f">>> Headers found: {headers}")

    # map columns
    col = {}
    for field, aliases in COLUMN_ALIASES.items():
        col[field] = find_column(headers, aliases)
        print(f"    {field:15s} -> col {col[field]} ({headers[col[field]] if col[field] is not None else 'not found'})")

    # process rows
    results    = []
    total_cost = 0.0
    issues     = []

    for index, row in enumerate(data_rows):
        if not row or all(c is None or str(c).strip() == "" for c in row):
            continue

        def get(field, fallback="—"):
            idx = col.get(field)
            if idx is None or idx >= len(row):
                return fallback
            return safe_str(row[idx], fallback)

        ref          = get("ref")
        description  = get("description")
        mpn          = get("mpn", "TBD")
        manufacturer = get("manufacturer")
        package      = get("package")
        mount        = get("mount", "SMD")
        dnp          = get("dnp", "N").upper()

        # qty
        qty_raw = col.get("qty")
        qty = safe_float(row[qty_raw]) if (qty_raw is not None and qty_raw < len(row)) else 1.0
        if qty == 0:
            qty = 1.0

        # unit price
        up_raw = col.get("unit_price")
        unit_price = safe_float(row[up_raw]) if (up_raw is not None and up_raw < len(row)) else 0.0

        # skip empty rows
        if ref == "—" and description == "—":
            continue

        # skip page headers/footers that sneak in
        if ref.lower() in ["ref", "ref.", "reference", "designator"]:
            continue

        ext_price = round(qty * unit_price, 4)

        if dnp != "Y":
            total_cost += ext_price

        if mpn in ("TBD", "—", ""):
            issues.append({"type": "error",   "ref": ref, "message": f"{ref}: Missing MPN"})
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
            "supplier_url": "",
        })

    if not results:
        raise ValueError("Could not extract any components from the PDF table.")

    active   = [r for r in results if r["dnp"] != "Y"]
    dnp_rows = [r for r in results if r["dnp"] == "Y"]

    print(f">>> Extracted {len(results)} components from PDF")

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