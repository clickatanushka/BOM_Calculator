# import pandas as pd
# import math

# COLUMN_ALIASES = {
#     "ref":          ["Designator", "Ref. Des.", "Ref", "Reference", "RefDes"],
#     "description":  ["Designation", "Description", "Value", "Component", "Desc"],
#     "mpn":          ["MPN", "Mfr Part", "Part Number", "Part No"],
#     "manufacturer": ["MFR", "Manufacturer", "Maker", "Mfr"],
#     "package":      ["Footprint", "Package", "Pkg"],
#     "qty":          ["Quantity", "Qty", "Count", "QTY"],
#     "unit_price":   ["Unit Price", "Unit_Price", "Price", "Unit Cost", "Unit €", "Price (€)"],
#     "mount":        ["Mount", "Mount Type", "Assembly"],
#     "dnp":          ["DNP"],
#     "supplier_url": ["Supplier and ref", "Supplier URL", "Supplier", "Digikey URL"],
# }

# def find_column(df_columns, aliases):
#     df_cols_lower = [c.lower().strip() for c in df_columns]
#     for alias in aliases:
#         alias_lower = alias.lower().strip()
#         for i, col in enumerate(df_cols_lower):
#             if alias_lower == col or alias_lower in col or col in alias_lower:
#                 return df_columns[i]
#     return None

# def safe_float(value):
#     try:
#         result = float(value)
#         if math.isnan(result) or math.isinf(result):
#             return 0.0
#         return result
#     except (TypeError, ValueError):
#         return 0.0

# def safe_str(value, fallback="—"):
#     if value is None:
#         return fallback
#     try:
#         if math.isnan(float(value)):
#             return fallback
#     except (TypeError, ValueError):
#         pass
#     s = str(value).strip()
#     return s if s else fallback

# def process_bom(filepath):
#     df = pd.read_excel(filepath)
#     df.columns = [str(c).strip() for c in df.columns]
#     df = df.dropna(how="all")

#     print(">>> BOM columns found:", list(df.columns))

#     col = {}
#     for field, aliases in COLUMN_ALIASES.items():
#         col[field] = find_column(list(df.columns), aliases)
#         print(f"    {field:15s} -> {col[field]}")

#     results = []
#     total_cost = 0.0
#     issues = []

#     for index, row in df.iterrows():
#         ref          = safe_str(row[col["ref"]]          if col["ref"]          else None)
#         description  = safe_str(row[col["description"]]  if col["description"]  else None)
#         mpn          = safe_str(row[col["mpn"]]          if col["mpn"]          else None, fallback="TBD")
#         manufacturer = safe_str(row[col["manufacturer"]] if col["manufacturer"] else None)
#         package      = safe_str(row[col["package"]]      if col["package"]      else None)
#         qty          = safe_float(row[col["qty"]]         if col["qty"]          else 1)
#         unit_price   = safe_float(row[col["unit_price"]]  if col["unit_price"]   else None)
#         mount        = safe_str(row[col["mount"]]        if col["mount"]        else None, fallback="SMD")
#         dnp          = safe_str(row[col["dnp"]]          if col["dnp"]          else None, fallback="N").upper()
#         supplier_url = safe_str(row[col["supplier_url"]] if col["supplier_url"] else None, fallback="")

#         if ref == "—" and description == "—":
#             continue

#         ext_price = round(qty * unit_price, 4)

#         if dnp != "Y":
#             total_cost += ext_price

#         if mpn == "TBD" or mpn == "—":
#             issues.append({"type": "error", "ref": ref, "message": f"{ref}: Missing MPN"})
#         if unit_price == 0.0 and dnp != "Y":
#             issues.append({"type": "warning", "ref": ref, "message": f"{ref}: No unit price"})

#         results.append({
#             "id":           index + 1,
#             "ref":          ref,
#             "description":  description,
#             "mpn":          mpn,
#             "manufacturer": manufacturer,
#             "package":      package,
#             "qty":          int(qty) if qty == int(qty) else qty,
#             "unit_price":   unit_price,
#             "ext_price":    ext_price,
#             "mount":        mount,
#             "dnp":          dnp,
#             "supplier_url": supplier_url,
#         })

#     active   = [r for r in results if r["dnp"] != "Y"]
#     dnp_rows = [r for r in results if r["dnp"] == "Y"]

#     return {
#         "bom":        results,
#         "total_cost": round(total_cost, 2),
#         "issues":     issues,
#         "stats": {
#             "total_lines":  len(results),
#             "active_lines": len(active),
#             "dnp_lines":    len(dnp_rows),
#             "issue_count":  len(issues),
#         }
#     }


"""
quotation_engine.py — Universal BOM parser + issue checker
Supports: English BOMs (Eagle/KiCad), German BOMs (Bezeichner/Menge/Bauform),
          Extender-style BOMs (Part/Value/MPN/Qty/Place_YES/NO)
          and any future format via fuzzy column mapping.
"""

import pandas as pd
import re
import math
import io
import os


# ══════════════════════════════════════════════════════════════════════════════
# COLUMN ALIASES
# Each canonical field maps to every known column name across all BOM formats.
# Add new aliases here — nothing else needs to change.
# ══════════════════════════════════════════════════════════════════════════════
COLUMN_ALIASES = {
    "ref": [
        "ref", "reference", "references", "designator", "ref designator",
        "refdes", "ref_des", "component", "part", "bezeichner",
        "referenz", "bauteil",
    ],
    "description": [
        "description", "description2", "desc", "comment", "comments",
        "value", "wert", "beschreibung", "bezeichnung", "gerätetyp",
        "device", "type", "part type",
    ],
    "mpn": [
        "mpn", "mfr part number", "manufacturer part number",
        "manufacturer part no", "mfr part no", "part number", "part no",
        "partnumber", "part#", "ordernumber", "order number",
        "digikey part number", "mouser part number",
        "mpn / wert", "mpn/wert", "mpn / wert 2",
        "artikelnummer", "bestellnummer",
    ],
    "manufacturer": [
        "manufacturer", "mfr", "mfg", "maker",
        "hersteller", "hersteller 2",
    ],
    "package": [
        "package", "footprint", "case", "housing", "smd", "mounting",
        "bauform", "gehäuse",
    ],
    "qty": [
        "qty", "quantity", "amount", "count", "number", "num",
        "menge", "anzahl", "stückzahl",
    ],
    "dnp": [
        "dnp", "do not place", "do not populate", "nopop",
        "place_yes/no", "place yes/no", "place",
        "nicht platzieren", "bestücken", "provided_by_customer",
    ],
}

# Values that mean DNP=True across all formats
# NOTE: "nein" for a "Nicht platzieren" column means "no, do NOT skip it" = place it = not DNP
# So for German "Nicht platzieren" cols: ja=DNP, nein=place
# For English "Place_YES/NO" cols: Y=place (not DNP), N=DNP
DNP_TRUE_VALUES  = {"n", "no", "dnp", "false", "0"}   # generic "excluded" values
DNP_FALSE_VALUES = {"y", "yes", "true", "1"}           # generic "included" values


def _normalise_col(name: str) -> str:
    """Lowercase, strip, collapse whitespace for fuzzy matching."""
    return re.sub(r"\s+", " ", str(name).lower().strip())


def _find_col(df_cols: list, canonical: str) -> str | None:
    """Return the first df column that matches any alias for canonical field."""
    aliases = [_normalise_col(a) for a in COLUMN_ALIASES.get(canonical, [])]
    norm_cols = {_normalise_col(c): c for c in df_cols}
    for alias in aliases:
        if alias in norm_cols:
            return norm_cols[alias]
    # substring fallback: alias is contained in a column name
    for alias in aliases:
        for nc, orig in norm_cols.items():
            if alias in nc or nc in alias:
                return orig
    return None


def _parse_dnp(value, col_name: str) -> bool:
    """
    Return True if the part should NOT be placed (DNP).

    Column semantics:
      "Place_YES/NO"     → Y=place(keep), N=skip(DNP)
      "Nicht platzieren" → ja=skip(DNP), nein=place(keep)
      "DNP" / "Do not"  → Y/yes/ja=DNP
      generic            → look up in value tables
    """
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return False
    s = str(value).lower().strip()
    col_lower = _normalise_col(col_name)

    # "Place_YES/NO" — positive means PLACE (not DNP)
    if "place" in col_lower:
        if s in ("y", "yes", "ja", "true", "1"):
            return False   # place it
        if s in ("n", "no", "nein", "false", "0"):
            return True    # do not place = DNP
        return False

    # "Nicht platzieren" (German: "Do not place") — ja=DNP, nein=place
    if "nicht" in col_lower or "platzieren" in col_lower:
        return s in ("ja", "yes", "y", "true", "1", "dnp")

    # "DNP" / "Do not place" / "nopop" columns — presence of yes/ja = DNP
    if any(k in col_lower for k in ["dnp", "do not", "nopop", "bestücken"]):
        return s in ("y", "yes", "ja", "true", "1", "dnp", "x")

    # Generic fallback
    return s in DNP_TRUE_VALUES


def _parse_qty(value) -> int:
    """Safely parse quantity, returning 1 on failure."""
    try:
        v = str(value).strip().replace(",", ".")
        f = float(v)
        return max(1, int(round(f))) if not math.isnan(f) else 1
    except Exception:
        return 1


def _count_refs(ref_string: str) -> int:
    """Count individual ref designators in a comma/space-separated string."""
    if not ref_string or str(ref_string).strip() in ("", "—", "-"):
        return 0
    parts = re.split(r"[,;\s]+", str(ref_string).strip())
    return len([p for p in parts if p])


def _clean_mpn(mpn) -> str:
    if mpn is None:
        return ""
    s = str(mpn).strip()
    # Remove trailing comma-separated alternative notes (e.g. "PMEG3020EPA,115")
    # Keep only if it looks like an MPN (no spaces, reasonable length)
    if "," in s:
        candidate = s.split(",")[0].strip()
        # If second part is short numeric it's a suffix code — keep first only
        rest = s.split(",")[1].strip()
        if re.match(r"^\d{1,4}$", rest):
            s = candidate
    return s


def _find_header_row(df_raw: pd.DataFrame) -> int:
    """
    Some BOMs have metadata rows before the actual header.
    Scan up to 10 rows looking for the row with the most alias matches.
    Returns the row index to use as header (0-based).
    """
    all_aliases = set()
    for aliases in COLUMN_ALIASES.values():
        all_aliases.update(_normalise_col(a) for a in aliases)

    best_row  = 0
    best_score = 0

    for i in range(min(10, len(df_raw))):
        row_vals = [_normalise_col(str(v)) for v in df_raw.iloc[i] if pd.notna(v)]
        score = sum(1 for v in row_vals if any(v == a or a in v or v in a for a in all_aliases))
        if score > best_score:
            best_score = score
            best_row   = i

    return best_row


# ══════════════════════════════════════════════════════════════════════════════
# MAIN PARSER
# ══════════════════════════════════════════════════════════════════════════════
def parse_bom(file_obj) -> dict:
    """
    Parse any BOM Excel file.
    Returns: { bom: [...], stats: {...}, issues: [...] }
    """
    # ── Load all sheets ──
    if isinstance(file_obj, (str, os.PathLike)):
        xl = pd.ExcelFile(file_obj)
    else:
        data = file_obj.read()
        xl   = pd.ExcelFile(io.BytesIO(data))

    all_rows  = []
    all_issues = []

    for sheet_name in xl.sheet_names:
        raw = pd.read_excel(xl, sheet_name=sheet_name, header=None, dtype=str)
        if raw.empty:
            continue

        # Detect header row
        header_row = _find_header_row(raw)
        df = pd.read_excel(xl, sheet_name=sheet_name,
                           header=header_row, dtype=str)
        df.columns = [str(c).strip() for c in df.columns]

        # Drop fully-empty rows
        df = df.dropna(how="all")
        if df.empty:
            continue

        # Map columns
        col_ref   = _find_col(df.columns.tolist(), "ref")
        col_desc  = _find_col(df.columns.tolist(), "description")
        col_mpn   = _find_col(df.columns.tolist(), "mpn")
        col_mfr   = _find_col(df.columns.tolist(), "manufacturer")
        col_pkg   = _find_col(df.columns.tolist(), "package")
        col_qty   = _find_col(df.columns.tolist(), "qty")
        col_dnp   = _find_col(df.columns.tolist(), "dnp")

        # Sheet-level warning if critical columns missing
        if not col_ref and not col_qty:
            continue   # not a BOM sheet

        for row_idx, row in df.iterrows():
            ref_raw  = str(row[col_ref]).strip()   if col_ref  else ""
            desc_raw = str(row[col_desc]).strip()  if col_desc else ""
            mpn_raw  = _clean_mpn(row[col_mpn])   if col_mpn  else ""
            mfr_raw  = str(row[col_mfr]).strip()   if col_mfr  else ""
            pkg_raw  = str(row[col_pkg]).strip()   if col_pkg  else ""
            qty_raw  = str(row[col_qty]).strip()   if col_qty  else "1"
            dnp_raw  = row[col_dnp]                if col_dnp  else None

            # Skip clearly empty rows
            if ref_raw in ("", "nan", "None", "—") and mpn_raw in ("", "nan", "None"):
                continue

            # Parse fields
            qty = _parse_qty(qty_raw)
            dnp = _parse_dnp(dnp_raw, col_dnp if col_dnp else "")

            # Clean nans
            def clean(v):
                return "" if v in ("nan", "None", "NaN") else v

            ref_raw  = clean(ref_raw)
            desc_raw = clean(desc_raw)
            mpn_raw  = clean(mpn_raw)
            mfr_raw  = clean(mfr_raw)
            pkg_raw  = clean(pkg_raw)

            bom_row = {
                "ref":          ref_raw,
                "description":  desc_raw,
                "mpn":          mpn_raw,
                "manufacturer": mfr_raw,
                "package":      pkg_raw,
                "qty":          qty,
                "dnp":          "Y" if dnp else "N",
                "price_state":  "unpriced",
                # pricing fields (populated by price_engine)
                "unit_price":     None,
                "per_board_cost": None,
                "extended_price": None,
                "nexar_price":    None,
                "nexar_stock":    None,
                "nexar_supplier": None,
                "nexar_all":      [],
            }
            all_rows.append(bom_row)

    # ── Deduplicate by MPN (same MPN appearing on multiple sheets) ──
    seen_mpns  = {}
    deduped    = []
    for r in all_rows:
        mpn = r["mpn"].upper()
        ref = r["ref"]
        if mpn and mpn in seen_mpns:
            # Merge refs and sum qty
            existing = deduped[seen_mpns[mpn]]
            existing_refs = existing["ref"]
            if ref and ref not in existing_refs:
                existing["ref"] = existing_refs + ", " + ref if existing_refs else ref
            existing["qty"] += r["qty"]
        else:
            if mpn:
                seen_mpns[mpn] = len(deduped)
            deduped.append(r)

    all_rows = deduped

    # ── Assign sequential IDs ──
    for i, r in enumerate(all_rows):
        r["id"] = i + 1

    # ── ISSUES ──
    active_rows = [r for r in all_rows if r["dnp"] != "Y"]

    total_lines  = len(all_rows)
    active_lines = len(active_rows)
    dnp_lines    = total_lines - active_lines

    issues = _check_issues(active_rows)

    stats = {
        "total_lines":  total_lines,
        "active_lines": active_lines,
        "dnp_lines":    dnp_lines,
        "issue_count":  len(issues),
    }

    return {
        "bom":    all_rows,
        "stats":  stats,
        "issues": issues,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ISSUE CHECKER
# ══════════════════════════════════════════════════════════════════════════════
def _check_issues(active_rows: list) -> list:
    """
    Run all BOM quality checks on active (non-DNP) rows.
    Returns list of { type, message } dicts.

    Checks:
      1. MPN missing
      2. Qty on row doesn't match number of ref designators listed
      3. Description missing
      4. Package missing
      5. Duplicate MPN with different descriptions (possible error)
    """
    issues = []

    mpn_to_descs = {}   # for duplicate-MPN check

    for row in active_rows:
        ref  = row.get("ref", "")
        mpn  = row.get("mpn", "")
        desc = row.get("description", "")
        pkg  = row.get("package", "")
        qty  = row.get("qty", 1)
        label = f"[{ref or 'no ref'}]"

        # ── 1. MPN MISSING ──
        if not mpn or mpn.strip() in ("", "—", "TBD", "tbd", "nan"):
            issues.append({
                "type":    "error",
                "message": f"{label} MPN is missing — cannot price this part.",
            })

        # ── 2. QTY vs REF COUNT MISMATCH ──
        # Only check if ref contains comma-separated designators
        if ref and "," in ref:
            ref_count = _count_refs(ref)
            if ref_count > 0 and ref_count != qty:
                issues.append({
                    "type":    "warn",
                    "message": (
                        f"{label} Qty={qty} but {ref_count} ref designators listed "
                        f"({ref[:60]}{'…' if len(ref) > 60 else ''}). "
                        f"Check for missing or extra refs."
                    ),
                })
        elif ref and not re.search(r"[,;\s]", ref.strip()):
            # Single ref — qty should be 1
            if qty != 1:
                issues.append({
                    "type":    "warn",
                    "message": (
                        f"{label} Single ref designator but Qty={qty}. "
                        f"Are some refs missing from the REF column?"
                    ),
                })

        # ── 3. DESCRIPTION MISSING ──
        if not desc or desc.strip() in ("", "—", "nan"):
            issues.append({
                "type":    "warn",
                "message": f"{label} (MPN: {mpn or '—'}) has no description.",
            })

        # ── 4. PACKAGE MISSING ──
        if not pkg or pkg.strip() in ("", "—", "nan"):
            issues.append({
                "type":    "warn",
                "message": f"{label} (MPN: {mpn or '—'}) has no package/footprint.",
            })

        # Collect for duplicate check
        if mpn:
            mpn_upper = mpn.upper()
            if mpn_upper not in mpn_to_descs:
                mpn_to_descs[mpn_upper] = []
            mpn_to_descs[mpn_upper].append(desc.strip())

    # ── 5. DUPLICATE MPN WITH DIFFERENT DESCRIPTION ──
    for mpn, descs in mpn_to_descs.items():
        unique_descs = set(d for d in descs if d)
        if len(unique_descs) > 1:
            issues.append({
                "type":    "warn",
                "message": (
                    f"MPN '{mpn}' appears {len(descs)}× with different descriptions: "
                    f"{', '.join(list(unique_descs)[:3])}. Possible copy/paste error."
                ),
            })

    return issues


# ══════════════════════════════════════════════════════════════════════════════
# COMPUTE BOM COST TOTALS
# ══════════════════════════════════════════════════════════════════════════════
def compute_bom_cost(bom_rows: list, board_qty: int = 1) -> dict:
    """
    Recalculate per-board and total costs from enriched BOM.
    Returns { bom_cost_per_board, total_cost, priced_count, rfq_count, unpriced_count }
    """
    bom_cost_per_board = 0.0
    total_cost         = 0.0
    priced_count       = 0
    rfq_count          = 0
    unpriced_count     = 0

    for row in bom_rows:
        if row.get("dnp") == "Y":
            continue
        state = row.get("price_state", "unpriced")
        if state == "rfq":
            rfq_count += 1
            continue
        pb = row.get("per_board_cost") or 0
        ex = row.get("extended_price") or 0
        if pb:
            bom_cost_per_board += pb
            total_cost         += ex
            priced_count       += 1
        else:
            unpriced_count += 1

    return {
        "bom_cost_per_board": round(bom_cost_per_board, 4),
        "total_cost":         round(total_cost, 4),
        "priced_count":       priced_count,
        "rfq_count":          rfq_count,
        "unpriced_count":     unpriced_count,
    }
process_bom = parse_bom