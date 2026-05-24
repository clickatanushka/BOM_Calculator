# ==========================================
# EMS AI AGENT
# Chains all steps automatically
# Upload BOM → prices → SMT → quote → PDF → email
# ==========================================

import os
from tools import bom_tool, price_tool, smt_tool, quote_tool, email_tool
from pdf_generator import generate_pdf


def run_agent(filepath, customer, project, qty, asm_cost, margin, ref="QT-001"):
    """
    Full pipeline. Returns step-by-step results.
    Each step updates the progress dict.
    """

    results = {
        "steps":    [],
        "bom":      None,
        "prices":   None,
        "smt":      None,
        "quote":    None,
        "email":    None,
        "pdf_path": None,
        "error":    None,
    }

    def log(step, status, message):
        results["steps"].append({
            "step":    step,
            "status":  status,
            "message": message,
        })
        print(f"[Agent] Step {step}: {message}")

    # ── STEP 1: Parse BOM ──
    try:
        log(1, "running", "Parsing BOM file...")
        bom_data = bom_tool.run(filepath)
        results["bom"] = bom_data
        log(1, "done", f"BOM parsed — {bom_data['stats']['total_lines']} components found")
    except Exception as e:
        log(1, "error", f"BOM parse failed: {str(e)}")
        results["error"] = str(e)
        return results

    # ── STEP 2: Fetch DigiKey Prices ──
    try:
        log(2, "running", "Fetching live prices from DigiKey...")
        enriched_bom = price_tool.run(bom_data["bom"])
        priced = [r for r in enriched_bom if r.get("digikey_price")]
        results["prices"] = enriched_bom
        log(2, "done", f"Prices fetched — {len(priced)}/{len(enriched_bom)} parts priced")
    except Exception as e:
        log(2, "error", f"DigiKey lookup failed: {str(e)}")
        enriched_bom = bom_data["bom"]  # continue with original

    # ── STEP 3: SMT Feasibility ──
    try:
        log(3, "running", "Checking SMT feasibility...")
        smt_data = smt_tool.run(enriched_bom)
        results["smt"] = smt_data
        log(3, "done", f"SMT check done — {smt_data['overall']}: {smt_data['summary']}")
    except Exception as e:
        log(3, "error", f"SMT check failed: {str(e)}")

    # ── STEP 4: Calculate Quotation ──
    try:
        log(4, "running", "Calculating quotation...")
        bom_cost = sum(
            (r.get("digikey_price") or r.get("unit_price") or 0) * r.get("qty", 1)
            for r in enriched_bom
            if r.get("dnp") != "Y"
        )
        quote_data = quote_tool.run(bom_cost, asm_cost, margin, qty)
        results["quote"] = quote_data
        log(4, "done", f"Quote calculated — sell price €{quote_data['sell_unit']:.2f}/board")
    except Exception as e:
        log(4, "error", f"Quote calculation failed: {str(e)}")
        results["error"] = str(e)
        return results

    # ── STEP 5: Generate PDF ──
    try:
        log(5, "running", "Generating PDF quotation...")
        pdf_data = {
            "customer":       customer,
            "project":        project,
            "ref":            ref,
            "qty":            qty,
            "bom_cost":       quote_data["bom_cost"],
            "asm_cost":       quote_data["asm_cost"],
            "margin":         margin,
            "bom":            enriched_bom,
            "ai_description": "",
        }
        pdf_buf  = generate_pdf(pdf_data)
        pdf_path = os.path.join("outputs", f"{ref.replace('-','_')}.pdf")
        with open(pdf_path, "wb") as f:
            f.write(pdf_buf.read())
        results["pdf_path"] = pdf_path
        log(5, "done", f"PDF saved → {pdf_path}")
    except Exception as e:
        log(5, "error", f"PDF generation failed: {str(e)}")

    # ── STEP 6: Draft Email ──
    try:
        log(6, "running", "Drafting customer email...")
        email_text = email_tool.run({
            "customer":        customer,
            "project":         project,
            "ref":             ref,
            "qty":             qty,
            "sell_unit":       quote_data["sell_unit"],
            "sell_total":      quote_data["sell_total"],
            "bom_lines":       bom_data["stats"]["total_lines"],
            "high_risk_count": results["smt"]["summary"].get("HIGH", 0) if results["smt"] else 0,
        })
        results["email"] = email_text
        log(6, "done", "Email drafted successfully")
    except Exception as e:
        log(6, "error", f"Email draft failed: {str(e)}")

    return results
