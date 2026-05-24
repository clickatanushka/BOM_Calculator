# ==========================================
# SMT FEASIBILITY CHECKER
# Classifies every component by assembly risk
# ==========================================

# Risk levels
LOW    = "LOW"
MEDIUM = "MEDIUM"
HIGH   = "HIGH"

# Package risk database
PACKAGE_RISK = {
    # Very easy - standard SMD passives
    "0402": LOW,
    "0603": LOW,
    "0805": LOW,
    "1206": LOW,
    "1210": LOW,
    "2010": LOW,
    "2512": LOW,

    # THT - manual assembly needed
    "tht":          MEDIUM,
    "through hole": MEDIUM,
    "radial":       MEDIUM,
    "axial":        MEDIUM,
    "dip":          MEDIUM,
    "pdip":         MEDIUM,

    # Small SMD ICs - need good paste
    "sot-23":  LOW,
    "sot23":   LOW,
    "sot-223": LOW,
    "sot223":  LOW,
    "sot-363": LOW,
    "sc-70":   LOW,
    "sod-123": LOW,
    "sod123":  LOW,

    # Standard ICs
    "soic":   LOW,
    "so-8":   LOW,
    "so8":    LOW,
    "so-16":  LOW,
    "so-14":  LOW,
    "sop":    LOW,
    "tssop":  MEDIUM,
    "ssop":   MEDIUM,
    "msop":   MEDIUM,

    # Fine pitch - needs stencil + reflow
    "qfp":    MEDIUM,
    "lqfp":   MEDIUM,
    "tqfp":   MEDIUM,
    "qfp-32": MEDIUM,
    "qfp-44": MEDIUM,
    "qfp-64": MEDIUM,
    "qfp-80": MEDIUM,
    "qfp-100":MEDIUM,

    # Hard - no visible leads
    "qfn":    HIGH,
    "dfn":    HIGH,
    "mlf":    HIGH,
    "lga":    HIGH,
    "son":    HIGH,

    # Very hard - BGA
    "bga":    HIGH,
    "fbga":   HIGH,
    "tfbga":  HIGH,
    "csp":    HIGH,
    "wlcsp":  HIGH,
    "fcbga":  HIGH,

    # Tiny passives - need good equipment
    "0201":   HIGH,
    "01005":  HIGH,
}


def classify_package(package_str):
    """
    Takes a package string like 'QFN-32' or '0402'
    Returns risk level and reason
    """
    if not package_str or package_str == "—":
        return HIGH, "Missing package info — cannot assess"

    pkg_lower = package_str.lower().strip()

    # direct match first
    if pkg_lower in PACKAGE_RISK:
        risk = PACKAGE_RISK[pkg_lower]
        return risk, get_reason(pkg_lower, risk)

    # partial match
    for key, risk in PACKAGE_RISK.items():
        if key in pkg_lower:
            return risk, get_reason(package_str, risk)

    # unknown package
    return MEDIUM, f"Unknown package '{package_str}' — manual review needed"


def get_reason(pkg, risk):
    reasons = {
        LOW:    f"{pkg} — standard package, easy assembly",
        MEDIUM: f"{pkg} — moderate difficulty, needs stencil",
        HIGH:   f"{pkg} — high difficulty, needs X-ray inspection or special process",
    }
    return reasons.get(risk, "Unknown")


def check_smt(bom_rows):
    """
    Takes full BOM list
    Returns feasibility report
    """
    results = []
    summary = {LOW: 0, MEDIUM: 0, HIGH: 0, "missing": 0}

    for row in bom_rows:
        if row.get("dnp") == "Y":
            continue

        package = row.get("package", "—")
        risk, reason = classify_package(package)

        if not package or package == "—":
            summary["missing"] += 1
        else:
            summary[risk] += 1

        results.append({
            "ref":         row.get("ref", "—"),
            "description": row.get("description", "—"),
            "package":     package,
            "mpn":         row.get("mpn", "—"),
            "risk":        risk,
            "reason":      reason,
            "qty":         row.get("qty", 1),
        })

    # overall feasibility
    if summary[HIGH] == 0 and summary["missing"] == 0:
        overall = "FEASIBLE"
        overall_msg = "Board is straightforward to assemble with standard SMT equipment."
    elif summary[HIGH] <= 3:
        overall = "FEASIBLE WITH CARE"
        overall_msg = f"{summary[HIGH]} high-risk package(s) detected. Special process required for those parts."
    else:
        overall = "COMPLEX"
        overall_msg = f"{summary[HIGH]} high-risk packages detected. Requires advanced SMT capabilities."

    return {
        "results":     results,
        "summary":     summary,
        "overall":     overall,
        "overall_msg": overall_msg,
    }
